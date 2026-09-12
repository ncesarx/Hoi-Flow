import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        tenant: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    const passwordIsValid = await verifyPassword(
      user.passwordHash,
      password,
    );

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    if (!user.tenant || user.tenant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    await createSession(user.id);

    if (user.tenantId) {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: "LOGIN_SUCCESS",
          entityType: "User",
          entityId: user.id,
        },
      });
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Erro no login:", error);

    return NextResponse.json(
      { error: "Erro interno de autenticação." },
      { status: 500 },
    );
  }
}
