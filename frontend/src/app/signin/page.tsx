import { Suspense } from "react";
import SignIn from "@/components/keeper/signin";

export const metadata = { title: "Sign in — keeper" };

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
