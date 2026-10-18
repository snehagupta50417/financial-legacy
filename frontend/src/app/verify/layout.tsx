import { ConsoleShell } from "@/components/verify/shell";

export const metadata = { title: "Verify claims console (demo) — keeper" };

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
