import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/current-user";
import { getPermissionsForRole } from "@/lib/auth/rbac";
import { platformBrand } from "@/lib/platform/brand";

import { AdminShell } from "./admin-shell";

import "./admin.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const user = await requireUser();

  const permissions = [
    ...getPermissionsForRole(user.role),
  ];

  const hasTenant = Boolean(
    user.tenantId &&
    user.tenant,
  );

  return (
    <AdminShell
      platform={{
        name: platformBrand.name,
        product: platformBrand.product,
      }}
      user={{
        name:
          user.name ||
          user.email,
        email: user.email,
        role: user.role,
      }}
      tenant={{
        name:
          user.tenant?.name ??
          "Sem tenant associado",

        logo:
          user.tenant?.slug ===
          "xero-verde"
            ? "/brands/xero-verde/logo.png"
            : null,
      }}
      hasTenant={hasTenant}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  );
}
