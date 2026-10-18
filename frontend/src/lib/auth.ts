export interface Account { authenticated: boolean; mode: "demo" | "supabase"; accountId?: string; name?: string }
export async function account(): Promise<Account> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok && res.status !== 401) throw new Error("Sign-in is temporarily unavailable");
  return res.json();
}
export async function signOutAccount() { await fetch("/api/auth/logout", { method: "POST" }); }
