import { NextResponse } from 'next/server';
import { runUsersSyncJobs } from '../../../../services/runUsersSyncJobs.service';

export async function GET() {
  const result = await runUsersSyncJobs();
  return NextResponse.json(result, { status: 200 });
}