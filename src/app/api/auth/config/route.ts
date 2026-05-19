import { NextResponse } from 'next/server';
import { getDevAuthEmail, isDevAuthEnabled, isGoogleAuthConfigured } from '@/lib/auth-config';

export async function GET() {
  return NextResponse.json({
    googleConfigured: isGoogleAuthConfigured(),
    devMode: isDevAuthEnabled(),
    devEmail: getDevAuthEmail(),
  });
}
