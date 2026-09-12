import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      tenantId: session.user.tenantId,
      tenant: session.user.tenant
        ? {
            id: session.user.tenant.id,
            name: session.user.tenant.name,
            slug: session.user.tenant.slug,
          }
        : null,
    },
  });
}
