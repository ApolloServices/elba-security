import { inngest } from '../client';
import { getInstallationIds } from './data';

export const scheduleUsersScans = inngest.createFunction(
  { id: 'schedule-users-scans' },
  { cron: '0 0 * * *' },
  async () => {
    const installationIds = await getInstallationIds();
    await Promise.all(
      installationIds.map((installationId) =>
        inngest.send({ name: 'users/scan', data: { installationId, isFirstScan: true } })
      )
    );
  }
);
