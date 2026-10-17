import CaseShell from "@/components/fl/case-shell";

export default async function CaseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseShell caseId={id}>{children}</CaseShell>;
}
