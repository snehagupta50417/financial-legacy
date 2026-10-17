import ClaimDetail from "@/components/fl/claim-detail";

export default async function ClaimPage({ params }: { params: Promise<{ id: string; claimId: string }> }) {
  const { claimId } = await params;
  return <ClaimDetail claimId={claimId} />;
}
