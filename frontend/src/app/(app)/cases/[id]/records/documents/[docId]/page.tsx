import FieldReview from "@/components/fl/field-review";

export default async function FieldReviewPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { docId } = await params;
  return <FieldReview docId={docId} />;
}
