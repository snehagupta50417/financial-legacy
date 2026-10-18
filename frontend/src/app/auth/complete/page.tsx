"use client";
import { useEffect, useState } from "react";
import { account } from "@/lib/auth";
import { dispatch } from "@/keeper/store";
export default function CompleteSignIn() {
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    account().then(a => {
      if (!active) return;
      if (!a.authenticated || !a.accountId) { setError("Sign-in did not finish. Please return to sign in and try again."); return; }
      const previous = localStorage.getItem("keeper.account");
      if (previous !== a.accountId) {
        for (const key of ["keeper.demo.v1", "keeper.personal.v1", "finlegacy_session"]) localStorage.removeItem(key);
      }
      localStorage.setItem("keeper.account", a.accountId);
      dispatch({ t: "signIn", name: "You", mode: "signin" });
      const journey = new URLSearchParams(location.search).get("journey");
      location.replace(["discover", "prepare", "claim"].includes(journey || "") ? "/app?journey=" + journey : "/app");
    }).catch(() => setError("Cannot finish sign-in. Please try again."));
    return () => { active = false; };
  }, []);
  return <main className="grid min-h-dvh place-items-center p-8"><p role="status">{error || "Opening your Keeper account…"}{error && <a className="ml-2 underline" href="/signin">Sign in</a>}</p></main>;
}
