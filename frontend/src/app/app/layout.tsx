import AppShell from "@/components/keeper/shell";

export const metadata = { title: "keeper" };

export default function KeeperAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
