import { ClaimView } from "@/components/verify/claim";

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  return <ClaimView id={(await params).id} />;
}
