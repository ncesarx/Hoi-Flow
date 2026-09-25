import { Permissions } from "@/lib/auth/rbac";
import { listAuditLogsForTenant } from "@/lib/data/audit-logs";
import { requireTenantPermission } from "@/lib/tenant/authorized-context";

const actionLabels: Record<string, string> = {
  CATEGORY_CREATED: "Categoria criada",
  CATEGORY_UPDATED: "Categoria atualizada",
  CATEGORY_DELETED: "Categoria excluída",
  PRODUCT_CREATED: "Produto criado",
  PRODUCT_UPDATED: "Produto atualizado",
  OPTION_GROUP_CREATED: "Grupo criado",
  OPTION_GROUP_UPDATED: "Grupo atualizado",
  OPTION_CREATED: "Opção criada",
  OPTION_UPDATED: "Opção atualizada",
  OPTION_DELETED: "Opção excluída",
  PRODUCT_OPTION_GROUP_ATTACHED: "Grupo vinculado ao produto",
  PRODUCT_OPTION_GROUP_DETACHED: "Grupo removido do produto",
  ORDER_CREATED: "Pedido criado",
  ORDER_STATUS_CHANGED: "Status do pedido atualizado",
  WHATSAPP_CONVERSATION_RESUMED: "Automação da conversa retomada",
  WHATSAPP_MESSAGE_SENT: "Mensagem de atendimento enviada",
};

const entityLabels: Record<string, string> = {
  Category: "Categoria",
  Product: "Produto",
  OptionGroup: "Grupo de opções",
  Option: "Opção",
  ProductOptionGroup: "Vínculo do catálogo",
  Tenant: "Restaurante",
  User: "Usuário",
  Order: "Pedido",
  WhatsAppConversation: "Conversa WhatsApp",
};

export default async function AuditPage() {
  const { tenantId, tenant } = await requireTenantPermission(
    Permissions.TENANT_MANAGE,
  );

  const logs = await listAuditLogsForTenant(tenantId, 100);

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: tenant.timezone,
  });

  return (
    <div className="hf-page">
      <section className="hf-page-heading">
        <div>
          <span className="hf-eyebrow">Segurança e rastreabilidade</span>

          <h1>Auditoria</h1>

          <p>Últimos eventos administrativos de {tenant.name}.</p>
        </div>

        <span className="hf-module-chip">{logs.length} eventos</span>
      </section>

      <section className="hf-panel hf-audit-panel">
        {logs.length === 0 ? (
          <div className="hf-audit-empty">
            <strong>Nenhum evento registrado</strong>
            <p>As próximas alterações do catálogo aparecerão aqui.</p>
          </div>
        ) : (
          <div className="hf-audit-table-wrap">
            <table className="hf-audit-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Responsável</th>
                  <th>IP</th>
                  <th>Detalhes</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <time dateTime={log.createdAt.toISOString()}>
                        {dateFormatter.format(log.createdAt)}
                      </time>
                    </td>
                    <td>
                      <span className="hf-audit-action">
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {entityLabels[log.entityType] ?? log.entityType}
                      </strong>
                      <small>{log.entityId ?? "—"}</small>
                    </td>
                    <td>
                      <strong>{log.actor?.name ?? "Sistema"}</strong>
                      <small>{log.actor?.email ?? "Ação automática"}</small>
                    </td>
                    <td>{log.ipAddress ?? "—"}</td>
                    <td>
                      {log.metadata ? (
                        <details className="hf-audit-details">
                          <summary>Visualizar</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
