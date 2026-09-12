import { NextResponse } from "next/server";

import { OrderChannel, OrderStatus } from "@prisma/client";

import { getRequestIp } from "@/lib/audit/audit";
import { authErrorResponse } from "@/lib/auth/api-error";
import { Permissions } from "@/lib/auth/rbac";
import {
  createOrderForTenant,
  listOrdersForTenant,
} from "@/lib/data/orders";
import { assertSameOrigin } from "@/lib/security/same-origin";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function isOrderStatus(value: string): value is OrderStatus {
  return Object.values(OrderStatus).includes(value as OrderStatus);
}

export async function GET(request: Request) {
  try {
    const { tenantId } = await requireTenantPermission(
      Permissions.ORDER_READ,
    );
    const requestedStatus = new URL(request.url).searchParams.get("status");
    if (requestedStatus && !isOrderStatus(requestedStatus)) {
      return NextResponse.json(
        { error: "Status de pedido inválido." },
        { status: 400 },
      );
    }
    const status = requestedStatus
      ? (requestedStatus as OrderStatus)
      : undefined;

    return NextResponse.json({
      data: await listOrdersForTenant(
        tenantId,
        status,
      ),
    });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      NextResponse.json(
        { error: "Não foi possível listar os pedidos." },
        { status: 500 },
      )
    );
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { tenantId, userId } = await requireTenantPermission(
      Permissions.ORDER_WRITE,
    );
    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "O pedido deve conter itens." },
        { status: 400 },
      );
    }

    const items = body.items.map((item: unknown) => {
      const value = item as Record<string, unknown>;
      return {
        productId:
          typeof value.productId === "string" ? value.productId.trim() : "",
        quantity: Number(value.quantity),
        notes: optionalText(value.notes),
        optionIds: Array.isArray(value.optionIds)
          ? value.optionIds.filter(
              (optionId): optionId is string => typeof optionId === "string",
            )
          : [],
      };
    });

    const order = await createOrderForTenant(
      tenantId,
      {
        unitId: optionalText(body.unitId),
        channel: OrderChannel.MANUAL,
        customerName: optionalText(body.customerName),
        customerPhone: optionalText(body.customerPhone),
        notes: optionalText(body.notes),
        items,
      },
      {
        actorUserId: userId,
        ipAddress: getRequestIp(request),
      },
    );

    if (!order) {
      return NextResponse.json(
        { error: "Pedido inválido para o cardápio deste restaurante." },
        { status: 400 },
      );
    }

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    return (
      authErrorResponse(error) ??
      NextResponse.json(
        { error: "Não foi possível criar o pedido." },
        { status: 500 },
      )
    );
  }
}
