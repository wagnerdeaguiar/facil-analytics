export { dynamic } from '@/lib/route-config';

import { NextResponse } from 'next/server';
import { registerUserWithPassword } from '@/lib/auth-register';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await registerUserWithPassword({
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : '',
      password: typeof body.password === 'string' ? body.password : '',
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId: result.userId });
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar a conta.' }, { status: 500 });
  }
}
