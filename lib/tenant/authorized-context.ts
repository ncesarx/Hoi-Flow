import { getCurrentUser } from "@/lib/auth/current-user";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/auth/errors";
import {
  authorizeTenantSubject,
  type Permission,
} from "@/lib/auth/rbac";

export async function requireTenantPermission(
  permission: Permission,
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationError();
  }

  const authorization =
    authorizeTenantSubject(
      {
        role: user.role,
        tenantId: user.tenantId,
        hasTenant: Boolean(
          user.tenant,
        ),
      },
      permission,
    );

  if (!authorization.allowed) {
    if (
      authorization.reason ===
      "NO_TENANT"
    ) {
      throw new AuthorizationError(
        "Usuário sem tenant associado.",
      );
    }

    throw new AuthorizationError();
  }

  return {
    userId: user.id,
    tenantId: user.tenantId!,
    tenant: user.tenant!,
    role: user.role,
  };
}
