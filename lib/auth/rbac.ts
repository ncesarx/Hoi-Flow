import { RoleCode } from "@prisma/client";

export const Permissions = {
  CATALOG_READ: "catalog.read",
  CATALOG_WRITE: "catalog.write",

  UNIT_READ: "unit.read",
  UNIT_WRITE: "unit.write",

  USER_READ: "user.read",
  USER_MANAGE: "user.manage",

  TENANT_MANAGE: "tenant.manage",

  ORDER_READ: "order.read",
  ORDER_WRITE: "order.write",
} as const;

export type Permission =
  (typeof Permissions)[keyof typeof Permissions];

const ROLE_PERMISSIONS: Record<
  RoleCode,
  readonly Permission[]
> = {
  SUPER_ADMIN: [],

  OWNER: [
    Permissions.CATALOG_READ,
    Permissions.CATALOG_WRITE,
    Permissions.UNIT_READ,
    Permissions.UNIT_WRITE,
    Permissions.USER_READ,
    Permissions.USER_MANAGE,
    Permissions.TENANT_MANAGE,
    Permissions.ORDER_READ,
    Permissions.ORDER_WRITE,
  ],

  MANAGER: [
    Permissions.CATALOG_READ,
    Permissions.CATALOG_WRITE,
    Permissions.UNIT_READ,
    Permissions.UNIT_WRITE,
    Permissions.USER_READ,
    Permissions.ORDER_READ,
    Permissions.ORDER_WRITE,
  ],

  ATTENDANT: [
    Permissions.CATALOG_READ,
    Permissions.UNIT_READ,
    Permissions.ORDER_READ,
    Permissions.ORDER_WRITE,
  ],
};

export type TenantAuthorizationSubject = {
  role: RoleCode;
  tenantId: string | null;
  hasTenant: boolean;
};

export type TenantAuthorizationResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      reason:
        | "NO_TENANT"
        | "INSUFFICIENT_PERMISSION";
    };

export function hasPermission(
  role: RoleCode,
  permission: Permission,
) {
  return ROLE_PERMISSIONS[role].includes(
    permission,
  );
}

export function getPermissionsForRole(
  role: RoleCode,
): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function authorizeTenantSubject(
  subject: TenantAuthorizationSubject,
  permission: Permission,
): TenantAuthorizationResult {
  if (
    !subject.tenantId ||
    !subject.hasTenant
  ) {
    return {
      allowed: false,
      reason: "NO_TENANT",
    };
  }

  if (
    !hasPermission(
      subject.role,
      permission,
    )
  ) {
    return {
      allowed: false,
      reason:
        "INSUFFICIENT_PERMISSION",
    };
  }

  return {
    allowed: true,
  };
}
