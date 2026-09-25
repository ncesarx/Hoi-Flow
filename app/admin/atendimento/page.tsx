import { hasPermission, Permissions } from "@/lib/auth/rbac";
import { listWhatsAppConversationsForTenant } from "@/lib/data/whatsapp-conversations";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

import { WhatsAppInbox } from "./whatsapp-inbox";

export default async function WhatsAppInboxPage() {
  const context = await requireTenantPermission(Permissions.WHATSAPP_READ);
  const conversations = await listWhatsAppConversationsForTenant(
    context.tenantId,
  );

  return (
    <div className="hf-page">
      <section className="hf-page-heading">
        <div>
          <span className="hf-eyebrow">WhatsApp e atendimento humano</span>
          <h1>Atendimento</h1>
          <p>
            Acompanhe as conversas de {context.tenant.name} e devolva ao bot as
            sessões já concluídas pela equipe.
          </p>
        </div>
        <span className="hf-module-chip">{conversations.length} conversas</span>
      </section>

      <WhatsAppInbox
        canWrite={hasPermission(context.role, Permissions.WHATSAPP_WRITE)}
        initialConversations={JSON.parse(JSON.stringify(conversations))}
      />
    </div>
  );
}
