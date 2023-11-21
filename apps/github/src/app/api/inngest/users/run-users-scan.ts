/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { RequestError } from '@octokit/request-error';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import type { OrganizationMember } from '@/repositories/github/organization';
import { getPaginatedOrganizationMembers } from '@/repositories/github/organization';
import type { User } from '@/repositories/elba/resources/users/types';
import { inngest } from '../client';
import {
  deleteInstallationAdminsSyncedBefore,
  getInstallation,
  insertInstallationAdmins,
} from './data';

const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email ?? undefined,
  displayName: member.name ?? member.login,
  additionalEmails: [],
});

export const runUsersScan = inngest.createFunction(
  {
    id: 'run-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: 3,
  },
  {
    event: 'users/scan',
    rateLimit: {
      key: 'event.data.installationId',
      limit: 1,
      period: '24h',
    },
  },
  async ({ event, step }) => {
    const syncStartedAt = new Date();
    const { installationId, isFirstScan } = event.data;
    const installation = await getInstallation(installationId);

    const elba = new ElbaRepository(installation.elbaOrganizationId);
    let cursor: string | null = null;
    do {
      try {
        cursor = await step.run(`handle-page-${cursor ?? 'first'}`, async () => {
          // TODO: add log for invalidMembers
          const { nextCursor, validMembers } = await getPaginatedOrganizationMembers(
            installationId,
            installation.accountLogin,
            cursor
          );

          const installationAdmins = validMembers
            .filter((member) => member.role === 'ADMIN')
            .map((member) => ({
              installationId,
              adminId: member.id,
              lastSyncAt: syncStartedAt,
            }));

          if (installationAdmins.length > 0) {
            await insertInstallationAdmins(installationAdmins, syncStartedAt);
          }

          if (validMembers.length > 0) {
            await elba.users.updateUsers(validMembers.map(formatElbaUser));
          }

          return nextCursor;
        });
      } catch (error) {
        if (
          error instanceof RequestError &&
          error.response?.headers['x-ratelimit-remaining'] === '0' &&
          error.response.headers['x-ratelimit-reset']
        ) {
          const retryAfter = new Date(Number(error.response.headers['x-ratelimit-reset']) * 1000);
          await step.sleepUntil('wait-for-rate-limit', retryAfter);
        }
      }
    } while (cursor);

    await elba.users.deleteUsers(syncStartedAt);
    await deleteInstallationAdminsSyncedBefore(installationId, syncStartedAt);

    if (isFirstScan) {
      await inngest.send({
        name: 'third-party-apps/scan',
        data: { installationId, isFirstScan: true },
      });
    }
  }
);
