/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { RequestError } from '@octokit/request-error';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import type { OrganizationInstallation } from '@/repositories/github/organization';
import { getPaginatedOrganizationInstallations } from '@/repositories/github/organization';
import type { App } from '@/repositories/github/app';
import { getApp } from '@/repositories/github/app';
import type { ThirdPartyAppsObject } from '@/repositories/elba/resources/third-party-apps/types';
import { inngest } from '../client';
import { getInstallation, getInstallationAdminsIds } from './data';

const formatElbaAppScopes = (installationPermissions: OrganizationInstallation['permissions']) =>
  Object.entries(installationPermissions).map(([key, value]) => [key, value].join(':'));

const formatElbaApp = (
  app: App,
  installation: OrganizationInstallation,
  adminIds: string[]
): ThirdPartyAppsObject => {
  const scopes = formatElbaAppScopes(installation.permissions);
  return {
    id: `${installation.id}`,
    url: app.html_url,
    name: app.name,
    publisherName: app.owner?.name ?? undefined,
    description: app.description ?? undefined,
    users: adminIds.map((id) => ({
      id,
      scopes,
      createdAt: new Date(installation.created_at),
    })),
  };
};
export const runThirdPartyAppsScan = inngest.createFunction(
  {
    id: 'run-third-party-apps-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'third-party-apps/scan',
    rateLimit: {
      key: 'event.data.installationId',
      limit: 1,
      period: '24h',
    },
  },
  async ({ event, step }) => {
    const syncStartedAt = new Date();
    const { installationId } = event.data;
    const installation = await getInstallation(installationId);

    const elba = new ElbaRepository(installation.elbaOrganizationId);
    let cursor: string | null = null;

    const adminsIds = await getInstallationAdminsIds(installationId);

    do {
      try {
        cursor = await step.run(`handle-page-${cursor ?? 'first'}`, async () => {
          // TODO: add log for invalidInstallations
          const { nextCursor, validInstallations } = await getPaginatedOrganizationInstallations(
            installationId,
            installation.accountLogin,
            cursor
          );

          const elbaApps = await Promise.all(
            validInstallations
              .filter((appInstallation) => appInstallation.suspended_at === null)
              .map(async (appInstallation) => {
                const app = await getApp(installationId, appInstallation.app_slug);
                return formatElbaApp(app, appInstallation, adminsIds);
              })
          );

          await elba.thridPartyApps.updateObjects(elbaApps);
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
        } else {
          throw error;
        }
      }
    } while (cursor);

    await elba.thridPartyApps.deleteObjects(syncStartedAt);
  }
);
