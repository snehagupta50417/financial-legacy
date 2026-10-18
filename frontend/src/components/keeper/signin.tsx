"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { dispatch } from "@/keeper/store";
import { Btn, FamilyScene, Wordmark } from "./ui";

const JOURNEYS: Record<string, string> = { discover: "Find my assets", prepare: "Prepare for my family", claim: "Get help after a death" };

/** Prototype sign-in: clearly mocked. No password, OTP or credential is asked for or stored. */
export default function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const journey = params.get("journey");
  const [name, setName] = useState("");
  const [auth, setAuth] = useState<{ mode: string; configured: boolean } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/auth/config", { cache: "no-store" }).then(r => r.json()).then(setAuth).catch(() => setError("Cannot reach sign-in. Please try again.")); }, []);

  const go = (mode: "signin" | "sample") => {
    dispatch({ t: "signIn", name: name.trim() || (mode === "sample" ? "Asha Rao" : "You"), mode });
    router.push(journey && JOURNEYS[journey] && mode === "signin" ? `/app?journey=${journey}` : "/app");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="flex flex-col justify-between px-6 py-8 sm:px-12">
        <Wordmark />
        <div className="mx-auto w-full max-w-[26rem] py-12">
          <h1 className="display mt-4 text-[2.6rem]">Welcome to keeper.</h1>
          <p className="mt-3 text-ink/75">
            {journey && JOURNEYS[journey] ? <>You chose <b>{JOURNEYS[journey]}</b>. We’ll carry that into the conversation.</> : "Start a conversation. Add details as you go."}
          </p>
          {params.get("error") && <p role="alert" className="mt-4">Google sign-in did not finish. Please try again.</p>}
          {error && <p role="alert">{error}</p>}
          {auth?.mode === "supabase" ? <div className="mt-8"><form action="/api/auth/start" method="get"><input type="hidden" name="journey" value={journey && JOURNEYS[journey] ? journey : ""} /><Btn type="submit" disabled={!auth.configured} className="w-full">Continue with Google</Btn></form><p className="mt-3 text-sm">{auth.configured ? "Your Keeper cases are linked to your account. Use synthetic financial details only." : "Account sign-in needs to be configured before this app can be used online."}</p></div> : auth ? <>
          <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); go("signin"); }}>
            <label className="block">
              <span className="mb-1.5 block text-[0.95rem] font-medium">What should Keeper call you? <span className="font-normal text-muted-foreground">(optional)</span></span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} className="min-h-12 w-full rounded-xl border border-input bg-paper px-4 text-[1rem]" />
            </label>
            <Btn type="submit" className="w-full">Continue to Keeper</Btn>
          </form>
          <p className="mt-3 text-[0.88rem] text-muted-foreground">Your progress is saved to this browser session. Local demo mode. Please use made-up details for now.</p></> : <p role="status" className="mt-8">Checking sign-in…</p>}
          <div className="my-6 flex items-center gap-3 text-[0.85rem] text-muted-foreground"><hr className="flex-1 border-line" />or<hr className="flex-1 border-line" /></div>
          <Btn variant="quiet" className="w-full" onClick={() => router.push("/welcome")}>Explore an example</Btn>
          <p className="mt-3 text-[0.88rem] text-muted-foreground">A one-minute walk-through with fictional people, separate from your own records.</p>
        </div>
        <p className="text-[0.85rem] text-muted-foreground"><Link href="/" className="underline underline-offset-4">Back to the website</Link></p>
      </main>
      <aside className="paper-grain hidden items-center justify-center bg-secondary p-12 lg:flex" aria-hidden>
        <FamilyScene variant="porch" className="w-full max-w-[34rem]" />
      </aside>
    </div>
  );
}
