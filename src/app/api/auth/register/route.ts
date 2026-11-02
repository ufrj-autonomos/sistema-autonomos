import { readAuthPayload } from '@/lib/auth-request';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { checkRateLimit, clientAddress } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const blocked = await checkRateLimit(`register-ip:${clientAddress(req)}`, 30, 60 * 60);
    if (blocked) return blocked;
    const payload = await readAuthPayload(req);
    if (payload.error) return payload.error;
    const body = payload.body;
    const { email, name, password } = body;

    if (typeof email !== 'string' || typeof name !== 'string' || !name.trim() || name.trim().length < 2 || name.length > 150 || !password) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: email, name e password são requeridos.' },
        { status: 400 }
      );
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Email em formato inválido.' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres e no máximo 72 bytes.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já cadastrado com este email.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    return NextResponse.json(
      { success: true, pendingApproval: true, user, message: 'Cadastro recebido. Aguarde a aprovação de um administrador para entrar.' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Usuário já cadastrado com este email.' }, { status: 409 });
    }
    console.error('Erro no cadastro (/api/auth/register):', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar cadastro de usuário.' },
      { status: 500 }
    );
  }
}
