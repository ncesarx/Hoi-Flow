import { requireUser } from "@/lib/auth/current-user";

export async function requireTenantContext() {
  const user = await requireUser();

  if (!user.tenantId || !user.tenant) {
    throw new Error("Usuário sem tenant associado.");
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    tenant: user.tenant,
    role: user.role,
  };
}
