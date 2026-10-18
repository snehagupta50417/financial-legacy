import { Suspense } from "react";
import Tour from "@/components/keeper/tour";

export const metadata = { title: "See how Keeper works — keeper" };

export default function WelcomePage() {
  return (
    <Suspense>
      <Tour />
    </Suspense>
  );
}
