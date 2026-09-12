import {
  hasPermission,
  Permissions,
} from "@/lib/auth/rbac";

import {
  requireTenantPermission,
} from "@/lib/tenant/authorized-context";

import {
  CatalogManager,
} from "./catalog-manager";

export default async function CardapioPage() {
  const context =
    await requireTenantPermission(
      Permissions.CATALOG_READ,
    );

  const canWrite =
    hasPermission(
      context.role,
      Permissions.CATALOG_WRITE,
    );

  return (
    <div className="hf-page">
      <section className="hf-page-heading">
        <div>
          <span className="hf-eyebrow">
            Catálogo
          </span>

          <h1>
            Cardápio
          </h1>

          <p>
            Gerencie categorias,
            produtos e estrutura
            comercial de{" "}
            {context.tenant.name}.
          </p>
        </div>

        <span className="hf-module-chip">
          S1.11 · Grupos de opções
        </span>
      </section>

      <CatalogManager
        canWrite={canWrite}
      />
    </div>
  );
}
