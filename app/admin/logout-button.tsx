"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

export function LogoutButton() {
  const router = useRouter();

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
        },
      );
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className="hf-logout"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading
        ? "Saindo..."
        : "Sair"}
    </button>
  );
}
