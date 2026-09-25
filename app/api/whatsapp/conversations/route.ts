import { NextResponse } from "next/server";

import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import { listWhatsAppConversationsForTenant } from "@/lib/data/whatsapp-conversations";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

export async function GET() {
  try {
    const { tenantId } = await requireTenantPermission(
      Permissions.WHATSAPP_READ,
    );
    return NextResponse.json({
      data: await listWhatsAppConversationsForTenant(tenantId),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const errorId = crypto.randomUUID();
    console.error("Erro ao listar conversas WhatsApp", { errorId, error });
    return NextResponse.json(
      { error: "Não foi possível listar as conversas.", errorId },
      { status: 500 },
    );
  }
}
