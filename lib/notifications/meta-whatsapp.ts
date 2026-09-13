import type { NotificationSender } from "./provider";

export function createMetaWhatsAppSender(config: {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
}): NotificationSender {
  return {
    async send(input) {
      const response = await fetch(
        `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: input.recipient,
            type: "text",
            text: { preview_url: false, body: input.text },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Meta WhatsApp respondeu HTTP ${response.status}.`);
      }
      const payload = await response.json() as { messages?: Array<{ id?: string }> };
      const providerMessageId = payload.messages?.[0]?.id;
      if (!providerMessageId) throw new Error("Meta WhatsApp não retornou o ID da mensagem.");
      return { providerMessageId };
    },
  };
}
