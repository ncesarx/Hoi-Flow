import {
  dispatchNextOrderNotification,
  releaseExpiredNotificationClaims,
} from "@/lib/notifications/dispatcher";
import type { NotificationSender } from "@/lib/notifications/provider";
import {
  processNextWhatsAppMessage,
  releaseExpiredWhatsAppMessageClaims,
} from "./conversations";
import {
  dispatchNextWhatsAppReply,
  releaseExpiredWhatsAppReplyClaims,
} from "./outbound-dispatcher";

export type WhatsAppWorkerCycleResult = {
  inbound: number;
  replies: number;
  notifications: number;
};

export async function runWhatsAppWorkerCycle(input: {
  tenantId: string;
  phoneNumberId: string;
  batchSize: number;
  sender: NotificationSender;
}): Promise<WhatsAppWorkerCycleResult> {
  await releaseExpiredWhatsAppMessageClaims(input.tenantId);
  await releaseExpiredWhatsAppReplyClaims(input.tenantId, input.phoneNumberId);
  await releaseExpiredNotificationClaims(input.tenantId);

  const result: WhatsAppWorkerCycleResult = {
    inbound: 0,
    replies: 0,
    notifications: 0,
  };

  for (let index = 0; index < input.batchSize; index += 1) {
    const inbound = await processNextWhatsAppMessage(input.tenantId);
    if (!inbound) break;
    result.inbound += 1;
  }

  for (let index = 0; index < input.batchSize; index += 1) {
    const reply = await dispatchNextWhatsAppReply(
      input.tenantId,
      input.phoneNumberId,
      input.sender,
    );
    if (!reply.processed) break;
    result.replies += 1;
  }

  for (let index = 0; index < input.batchSize; index += 1) {
    const notification = await dispatchNextOrderNotification(
      input.tenantId,
      input.sender,
    );
    if (!notification.processed) break;
    result.notifications += 1;
  }

  return result;
}

export function whatsAppWorkerDidWork(result: WhatsAppWorkerCycleResult) {
  return result.inbound + result.replies + result.notifications > 0;
}
