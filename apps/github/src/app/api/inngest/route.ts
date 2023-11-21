import { serve } from 'inngest/next';
import { inngest } from './client';
import { scheduleUsersScans } from './users/schedule-users-scans';
import { scheduleThirdPartyAppsScans } from './users/schedule-third-party-apps-scans';
import { runUsersScan } from './users/run-users-scan';
import { runThirdPartyAppsScan } from './users/run-third-party-apps-scan';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleUsersScans, scheduleThirdPartyAppsScans, runUsersScan, runThirdPartyAppsScan],
});
