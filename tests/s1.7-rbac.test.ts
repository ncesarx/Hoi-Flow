import assert from "node:assert/strict";
import {
  describe,
  test,
} from "node:test";

import { RoleCode } from "@prisma/client";

import {
  authorizeTenantSubject,
  getPermissionsForRole,
  hasPermission,
  Permissions,
} from "../lib/auth/rbac";

import {
  AuthenticationError,
  AuthorizationError,
} from "../lib/auth/errors";

import {
  authErrorResponse,
} from "../lib/auth/api-error";

describe("S1.7 - RBAC", () => {
  test("OWNER pode ler catálogo", () => {
    assert.equal(
      hasPermission(
        RoleCode.OWNER,
        Permissions.CATALOG_READ,
      ),
      true,
    );
  });

  test("OWNER pode alterar catálogo", () => {
    assert.equal(
      hasPermission(
        RoleCode.OWNER,
        Permissions.CATALOG_WRITE,
      ),
      true,
    );
  });

  test("MANAGER pode alterar catálogo", () => {
    assert.equal(
      hasPermission(
        RoleCode.MANAGER,
        Permissions.CATALOG_WRITE,
      ),
      true,
    );
  });

  test("ATTENDANT pode consultar catálogo", () => {
    assert.equal(
      hasPermission(
        RoleCode.ATTENDANT,
        Permissions.CATALOG_READ,
      ),
      true,
    );
  });

  test("ATTENDANT não pode alterar catálogo", () => {
    assert.equal(
      hasPermission(
        RoleCode.ATTENDANT,
        Permissions.CATALOG_WRITE,
      ),
      false,
    );
  });

  test("MANAGER pode consultar usuários", () => {
    assert.equal(
      hasPermission(
        RoleCode.MANAGER,
        Permissions.USER_READ,
      ),
      true,
    );
  });

  test("MANAGER não pode administrar usuários", () => {
    assert.equal(
      hasPermission(
        RoleCode.MANAGER,
        Permissions.USER_MANAGE,
      ),
      false,
    );
  });

  test("OWNER pode administrar usuários", () => {
    assert.equal(
      hasPermission(
        RoleCode.OWNER,
        Permissions.USER_MANAGE,
      ),
      true,
    );
  });

  test("ATTENDANT pode operar pedidos", () => {
    assert.equal(
      hasPermission(
        RoleCode.ATTENDANT,
        Permissions.ORDER_WRITE,
      ),
      true,
    );
  });

  test("SUPER_ADMIN não recebe permissões de tenant implicitamente", () => {
    assert.deepEqual(
      getPermissionsForRole(
        RoleCode.SUPER_ADMIN,
      ),
      [],
    );
  });

  test("OWNER com tenant pode executar CATALOG_WRITE", () => {
    const result =
      authorizeTenantSubject(
        {
          role: RoleCode.OWNER,
          tenantId: "tenant-a",
          hasTenant: true,
        },
        Permissions.CATALOG_WRITE,
      );

    assert.deepEqual(
      result,
      {
        allowed: true,
      },
    );
  });

  test("MANAGER com tenant pode executar CATALOG_WRITE", () => {
    const result =
      authorizeTenantSubject(
        {
          role: RoleCode.MANAGER,
          tenantId: "tenant-a",
          hasTenant: true,
        },
        Permissions.CATALOG_WRITE,
      );

    assert.deepEqual(
      result,
      {
        allowed: true,
      },
    );
  });

  test("ATTENDANT com tenant pode executar CATALOG_READ", () => {
    const result =
      authorizeTenantSubject(
        {
          role: RoleCode.ATTENDANT,
          tenantId: "tenant-a",
          hasTenant: true,
        },
        Permissions.CATALOG_READ,
      );

    assert.deepEqual(
      result,
      {
        allowed: true,
      },
    );
  });

  test("ATTENDANT com tenant recebe negação em CATALOG_WRITE", () => {
    const result =
      authorizeTenantSubject(
        {
          role: RoleCode.ATTENDANT,
          tenantId: "tenant-a",
          hasTenant: true,
        },
        Permissions.CATALOG_WRITE,
      );

    assert.deepEqual(
      result,
      {
        allowed: false,
        reason:
          "INSUFFICIENT_PERMISSION",
      },
    );
  });

  test("usuário sem tenant é rejeitado", () => {
    const result =
      authorizeTenantSubject(
        {
          role: RoleCode.OWNER,
          tenantId: null,
          hasTenant: false,
        },
        Permissions.CATALOG_WRITE,
      );

    assert.deepEqual(
      result,
      {
        allowed: false,
        reason: "NO_TENANT",
      },
    );
  });

  test("SUPER_ADMIN sem tenant não atravessa contexto de tenant", () => {
    const result =
      authorizeTenantSubject(
        {
          role:
            RoleCode.SUPER_ADMIN,
          tenantId: null,
          hasTenant: false,
        },
        Permissions.CATALOG_READ,
      );

    assert.deepEqual(
      result,
      {
        allowed: false,
        reason: "NO_TENANT",
      },
    );
  });

  test("AuthenticationError vira HTTP 401", async () => {
    const response =
      authErrorResponse(
        new AuthenticationError(),
      );

    assert.ok(response);
    assert.equal(
      response.status,
      401,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "Não autenticado.",
    );
  });

  test("AuthorizationError vira HTTP 403", async () => {
    const response =
      authErrorResponse(
        new AuthorizationError(),
      );

    assert.ok(response);
    assert.equal(
      response.status,
      403,
    );

    const body =
      await response.json();

    assert.equal(
      body.error,
      "Sem permissão para executar esta operação.",
    );
  });

  test("erro desconhecido não é tratado como erro de autenticação", () => {
    const response =
      authErrorResponse(
        new Error("erro qualquer"),
      );

    assert.equal(
      response,
      null,
    );
  });
});
