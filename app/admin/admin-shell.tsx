"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "./logout-button";

type AdminShellProps = {
  children: ReactNode;

  platform: {
    name: string;
    product: string;
  };

  user: {
    name: string;
    email: string;
    role: string;
  };

  tenant: {
    name: string;
    logo: string | null;
  };

  hasTenant: boolean;

  permissions: readonly string[];
};

type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  permission?: string;
  tenantOnly?: boolean;
};

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "◆",
  },

  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: "▦",
    permission: "order.read",
    tenantOnly: true,
  },

  {
    label: "Cardápio",
    href: "/admin/cardapio",
    icon: "≡",
    permission: "catalog.read",
    tenantOnly: true,
  },

  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: "●",
    tenantOnly: true,
  },

  {
    label: "Unidades",
    href: "/admin/unidades",
    icon: "⌂",
    permission: "unit.read",
    tenantOnly: true,
  },
];

const secondaryNavigation: NavigationItem[] = [
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: "⚙",
    permission: "tenant.manage",
    tenantOnly: true,
  },
];

const roleLabels: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  ATTENDANT: "Atendente",
  SUPER_ADMIN: "Super Admin",
};

export function AdminShell({
  children,
  platform,
  user,
  tenant,
  hasTenant,
  permissions,
}: AdminShellProps) {
  const pathname = usePathname();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  function isAllowed(
    item: NavigationItem,
  ) {
    if (
      item.tenantOnly &&
      !hasTenant
    ) {
      return false;
    }

    if (
      item.permission &&
      !permissions.includes(
        item.permission,
      )
    ) {
      return false;
    }

    return true;
  }

  function isActive(
    href: string,
  ) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(
      href,
    );
  }

  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0),
      )
      .join("")
      .toUpperCase() || "HF";

  const roleLabel =
    roleLabels[user.role] ??
    user.role;

  return (
    <div className="hf-admin">
      <button
        type="button"
        aria-label="Fechar menu"
        className={`hf-overlay ${
          mobileOpen
            ? "is-visible"
            : ""
        }`}
        onClick={() =>
          setMobileOpen(false)
        }
      />

      <aside
        className={`hf-sidebar ${
          mobileOpen
            ? "is-open"
            : ""
        }`}
      >
        <div className="hf-platform-brand">
          <Link
            href="/admin"
            className="hf-platform-logo"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <span className="hf-platform-hoi">
              HOI-
            </span>

            <span className="hf-platform-flow">
              FLOW
            </span>
          </Link>

          <span className="hf-platform-product">
            {platform.product}
          </span>
        </div>

        {hasTenant && (
          <div className="hf-tenant-card">
            <div className="hf-tenant-logo">
              {tenant.logo ? (
                <img
                  src={tenant.logo}
                  alt={tenant.name}
                />
              ) : (
                <span>
                  {tenant.name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="hf-tenant-data">
              <span>
                Restaurante atual
              </span>

              <strong>
                {tenant.name}
              </strong>
            </div>
          </div>
        )}

        <nav
          className="hf-navigation"
          aria-label="Navegação principal"
        >
          {navigation
            .filter(isAllowed)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`hf-nav-link ${
                  isActive(item.href)
                    ? "is-active"
                    : ""
                }`}
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                <span
                  className="hf-nav-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </Link>
            ))}
        </nav>

        <div className="hf-sidebar-bottom">
          <nav
            className="hf-navigation hf-navigation-secondary"
          >
            {secondaryNavigation
              .filter(isAllowed)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hf-nav-link ${
                    isActive(item.href)
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  <span
                    className="hf-nav-icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>
                </Link>
              ))}
          </nav>

          <div className="hf-sidebar-signature">
            <span>
              Plataforma
            </span>

            <strong>
              {platform.name}
            </strong>

            <small>
              Home & Office
              Tech Solutions
            </small>
          </div>
        </div>
      </aside>

      <div className="hf-workspace">
        <header className="hf-topbar">
          <div className="hf-topbar-left">
            <button
              type="button"
              className="hf-mobile-menu"
              aria-label="Abrir menu"
              onClick={() =>
                setMobileOpen(true)
              }
            >
              <span />
              <span />
              <span />
            </button>

            <div className="hf-context">
              <span>
                Operação
              </span>

              <strong>
                {hasTenant
                  ? tenant.name
                  : platform.name}
              </strong>
            </div>
          </div>

          <div className="hf-topbar-right">
            <div className="hf-system-status">
              <i />
              Sistema online
            </div>

            <div className="hf-user">
              <div className="hf-avatar">
                {initials}
              </div>

              <div className="hf-user-info">
                <strong>
                  {user.name}
                </strong>

                <span>
                  {roleLabel}
                </span>
              </div>
            </div>

            <LogoutButton />
          </div>
        </header>

        <main className="hf-main">
          {children}
        </main>
      </div>
    </div>
  );
}
