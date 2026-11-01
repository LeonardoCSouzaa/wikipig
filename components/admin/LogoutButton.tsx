"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }
  return (
    <button type="button" className="btn" onClick={logout}>
      Sair
    </button>
  );
}
