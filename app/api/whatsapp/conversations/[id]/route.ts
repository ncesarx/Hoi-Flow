import { NextResponse } from "next/server";

import { getRequestIp } from "@/lib/audit/audit";
import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import {
  resumeWhatsAppConversationForTenant,
  sendWhatsAppConversationMessageForTenant,
} from "@/lib/data/whatsapp-conversations";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const { tenantId, userId } = await requireTenantPermission(
      Permissions.WHATSAPP_WRITE,
    );
    const body = await request.json();
    if (body.action !== "resume") {
      return NextResponse.json(
        { error: "Ação de conversa inválida." },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const conversation = await resumeWhatsAppConversationForTenant(
      tenantId,
      id,
      { actorUserId: userId, ipAddress: getRequestIp(request) },
    );
    return conversation
      ? NextResponse.json({ data: conversation })
      : NextResponse.json(
          { error: "Conversa não encontrada ou já retomada." },
          { status: 409 },
        );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const errorId = crypto.randomUUID();
    console.error("Erro ao retomar conversa WhatsApp", { errorId, error });
    return NextResponse.json(
      { error: "Não foi possível retomar a conversa.", errorId },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const { tenantId, userId } = await requireTenantPermission(
      Permissions.WHATSAPP_WRITE,
    );
    const body = await request.json();
    if (
      typeof body.text !== "string" ||
      !body.text.trim() ||
      body.text.trim().length > 1_000
    ) {
      return NextResponse.json(
        { error: "Mensagem inválida. Use entre 1 e 1000 caracteres." },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const message = await sendWhatsAppConversationMessageForTenant(
      tenantId,
      id,
      body.text,
      { actorUserId: userId, ipAddress: getRequestIp(request) },
    );
    return message
      ? NextResponse.json({ data: message }, { status: 201 })
      : NextResponse.json(
          { error: "Conversa não encontrada ou fora do atendimento humano." },
          { status: 409 },
        );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const errorId = crypto.randomUUID();
    console.error("Erro ao enviar mensagem WhatsApp", { errorId, error });
    return NextResponse.json(
      { error: "Não foi possível enviar a mensagem.", errorId },
      { status: 500 },
    );
  }
}
