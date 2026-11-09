"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void> };

export function OfflineReady() {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [state, setState] = useState<"idle" | "caching" | "ready">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const reg = navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => null);

    setState("caching");
    reg.then(() => {
      // Pronto quando o SW controla a página (conteúdo cacheado em install).
      if (navigator.serviceWorker.controller) setState("ready");
      navigator.serviceWorker.ready.then(() => setState("ready"));
    });

    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  }

  if (installEvt) {
    return (
      <button type="button" className="btn primary offline-btn" onClick={install}>
        Instalar app
      </button>
    );
  }

  const label =
    state === "ready"
      ? "Disponível offline"
      : state === "caching"
        ? "Salvando offline…"
        : "";
  if (!label) return null;

  return (
    <span className="offline-badge" title="Conteúdo salvo para uso sem internet">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </span>
  );
}
