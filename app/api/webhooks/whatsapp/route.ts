import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { parseMetaWebhookMessages, safeSecretEqual, verifyMetaWebhookSignature } from "@/lib/whatsapp/webhook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode !== "subscribe" || !token || !challenge || !expected || !safeSecretEqual(token, expected)) {
    return NextResponse.json({ error: "Webhook não autorizado." }, { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const tenantId = process.env.WHATSAPP_TENANT_ID;
  const expectedPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!appSecret || !tenantId || !expectedPhoneNumberId) {
    return NextResponse.json({ error: "Canal não configurado." }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyMetaWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Payload inválido." }, { status: 400 }); }
  const messages = parseMetaWebhookMessages(payload).filter((message) => message.phoneNumberId === expectedPhoneNumberId);
  if (messages.length > 0) {
    await prisma.whatsAppInboundMessage.createMany({
      data: messages.map((message) => ({
        ...message,
        tenantId,
        payload: message.payload as Prisma.InputJsonObject,
      })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json({ received: true });
}
