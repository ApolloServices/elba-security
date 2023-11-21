import { inngest } from '../client';
import { getInstallationIds } from './data';

export const scheduleThirdPartyAppsScans = inngest.createFunction(
  { id: 'schedule-third-party-apps-scans' },
  { cron: '0 0 * * *' },
  async () => {
    const installationIds = await getInstallationIds();
    await Promise.all(
      installationIds.map((installationId) =>
        inngest.send({
          name: 'third-party-apps/scan',
          data: { installationId, isFirstScan: false },
        })
      )
    );
  }
);
