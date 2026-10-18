"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Wordmark, Btn } from "@/components/keeper/ui";
import { clearConsole, consoleSnapshot, parseConsole, subscribeConsole, vapi, type ConsoleSession } from "@/lib/console-client";
import { Notice } from "./bits";

/** Every console screen sits inside this shell, so the demo banner is always on screen. */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  // null while rendering on the server, "" when signed out, otherwise the stored sign-in.
  const raw = useSyncExternalStore(subscribeConsole, consoleSnapshot, () => null);
  const me: ConsoleSession | null | undefined = useMemo(() => (raw === null ? undefined : parseConsole(raw)), [raw]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const signedOutPage = path === "/verify";

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, [msg]);
  useEffect(() => { if (me === null && !signedOutPage) router.replace("/verify"); }, [me, signedOutPage, router]);

  async function signOut() {
    setBusy(true);
    try { await vapi.signOut(); } catch { /* already gone */ }
    clearConsole(); setBusy(false); router.push("/verify");
  }
  async function reset() {
    setBusy(true); setMsg(null);
    try {
      await vapi.post("/api/console/reset");
      setMsg("Demo reset. The four claims are back as they arrived and the audit trail is empty.");
      setEpoch((n) => n + 1); // remount the page so it loads the fresh claims
      router.push("/verify/queue");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Could not reset the demo."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh bg-ivory">
      <div className="bg-ink px-4 py-2 text-center text-[0.85rem] font-medium text-ivory">Demo · synthetic data. No real claims, people or messages.</div>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Wordmark href="/" />
          <span className="display text-lg text-ink">Verify</span>
          {me && (
            <nav aria-label="Console" className="flex gap-4 text-[0.95rem]">
              <Link href="/verify/queue" className={path.startsWith("/verify/queue") || path.startsWith("/verify/claims") ? "font-semibold underline underline-offset-4" : "hover:underline"}>Claims</Link>
              <Link href="/verify/audit" className={path.startsWith("/verify/audit") ? "font-semibold underline underline-offset-4" : "hover:underline"}>Audit trail</Link>
            </nav>
          )}
          {me && (
            <div className="ml-auto flex flex-wrap items-center gap-2 text-[0.9rem]">
              <span className="text-muted-foreground">{me.institutionLabel} · {me.reviewer}</span>
              <Btn variant="quiet" className="min-h-9 px-3 text-[0.85rem]" onClick={reset} disabled={busy}>Reset demo</Btn>
              <Btn variant="quiet" className="min-h-9 px-3 text-[0.85rem]" onClick={signOut} disabled={busy}>Sign out</Btn>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {msg && <div className="mb-4"><Notice tone="ok">{msg}</Notice></div>}
        {me === undefined && !signedOutPage ? <p className="text-muted-foreground">Loading…</p> : <div key={epoch}>{children}</div>}
      </main>
    </div>
  );
}
