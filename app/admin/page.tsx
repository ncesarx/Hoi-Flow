import {
  Permissions,
  hasPermission,
} from "@/lib/auth/rbac";

import { requireUser } from "@/lib/auth/current-user";

import {
  getDashboardMetricsForTenant,
} from "@/lib/data/dashboard";

export default async function AdminPage() {
  const user = await requireUser();

  if (
    !user.tenantId ||
    !user.tenant
  ) {
    return (
      <div className="hf-page">
        <section className="hf-page-heading">
          <div>
            <span className="hf-eyebrow">
              Hoi-Flow
            </span>

            <h1>
              Dashboard
            </h1>

            <p>
              Nenhum restaurante está
              associado ao contexto atual.
            </p>
          </div>
        </section>

        <section className="hf-empty-state">
          <div className="hf-empty-logo">
            HF
          </div>

          <h2>
            Nenhum tenant selecionado
          </h2>

          <p>
            Este usuário não possui um
            restaurante associado para
            exibir indicadores operacionais.
          </p>
        </section>
      </div>
    );
  }

  const canViewUsers =
    hasPermission(
      user.role,
      Permissions.USER_READ,
    );

  const metrics =
    await getDashboardMetricsForTenant(
      user.tenantId,
      {
        includeUsers:
          canViewUsers,
      },
    );

  return (
    <div className="hf-page">
      <section className="hf-page-heading">
        <div>
          <span className="hf-eyebrow">
            Visão geral
          </span>

          <h1>
            Dashboard
          </h1>

          <p>
            Indicadores reais da operação
            de {user.tenant.name}.
          </p>
        </div>

        <span className="hf-live-chip">
          <i />
          Dados do restaurante
        </span>
      </section>

      <section className="hf-metrics">
        <article className="hf-metric-card">
          <div className="hf-metric-top">
            <span className="hf-metric-symbol">
              P
            </span>

            <span className="hf-metric-label">
              Produtos ativos
            </span>
          </div>

          <strong>
            {metrics.activeProducts}
          </strong>

          <small>
            Itens disponíveis no catálogo
          </small>
        </article>

        <article className="hf-metric-card">
          <div className="hf-metric-top">
            <span className="hf-metric-symbol">
              C
            </span>

            <span className="hf-metric-label">
              Categorias ativas
            </span>
          </div>

          <strong>
            {metrics.activeCategories}
          </strong>

          <small>
            Organização do cardápio
          </small>
        </article>

        <article className="hf-metric-card">
          <div className="hf-metric-top">
            <span className="hf-metric-symbol">
              U
            </span>

            <span className="hf-metric-label">
              Unidades ativas
            </span>
          </div>

          <strong>
            {metrics.activeUnits}
          </strong>

          <small>
            Estrutura operacional ativa
          </small>
        </article>

        <article className="hf-metric-card">
          <div className="hf-metric-top">
            <span className="hf-metric-symbol">
              E
            </span>

            <span className="hf-metric-label">
              Equipe ativa
            </span>
          </div>

          <strong
            className={
              metrics.activeUsers === null
                ? "hf-restricted-value"
                : undefined
            }
          >
            {metrics.activeUsers ??
              "Restrito"}
          </strong>

          <small>
            {metrics.activeUsers === null
              ? "Permissão USER_READ necessária"
              : "Usuários ativos no restaurante"}
          </small>
        </article>
      </section>

      <section className="hf-dashboard-grid">
        <article className="hf-panel hf-operation-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                Hoi-Flow
              </span>

              <h2>
                Estrutura operacional
              </h2>
            </div>

            <span className="hf-version">
              Dados reais
            </span>
          </div>

          <p>
            O Hoi-Flow já está conectado
            aos dados reais deste tenant.
            Os próximos indicadores serão
            incorporados conforme os
            módulos operacionais forem
            implementados.
          </p>

          <div className="hf-flow">
            <div>
              <span>01</span>

              <strong>
                Catálogo
              </strong>

              <small>
                {metrics.activeProducts}
                {" "}
                produtos ativos
              </small>
            </div>

            <i />

            <div>
              <span>02</span>

              <strong>
                Estrutura
              </strong>

              <small>
                {metrics.activeUnits}
                {" "}
                unidades ativas
              </small>
            </div>

            <i />

            <div>
              <span>03</span>

              <strong>
                Equipe
              </strong>

              <small>
                {metrics.activeUsers ??
                  "Acesso restrito"}
              </small>
            </div>
          </div>
        </article>

        <article className="hf-panel">
          <div className="hf-panel-header">
            <div>
              <span className="hf-eyebrow">
                Ambiente
              </span>

              <h2>
                Segurança
              </h2>
            </div>
          </div>

          <div className="hf-status-list">
            <div>
              <span>
                Tenant
              </span>

              <strong>
                {user.tenant.name}
              </strong>
            </div>

            <div>
              <span>
                Isolamento
              </span>

              <strong>
                <i />
                Multi-tenant
              </strong>
            </div>

            <div>
              <span>
                RBAC
              </span>

              <strong>
                {user.role}
              </strong>
            </div>

            <div>
              <span>
                Sessão
              </span>

              <strong>
                Protegida
              </strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
