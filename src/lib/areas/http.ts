import { NextResponse } from 'next/server';
import { AreaHubError } from './service';

export function areaHubErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AreaHubError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[areas]', error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
