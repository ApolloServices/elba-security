import { scheduleUsersSyncJobs } from '@/app/api/users/cron/schedule-sync-jobs/service';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = 'fra1';

export async function GET() {
  await scheduleUsersSyncJobs();

  return new NextResponse();
  // return new NextResponse(null, { status: 501, statusText: 'Not Implemented' });
}
