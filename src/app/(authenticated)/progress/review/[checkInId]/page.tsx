import { WeeklyReviewPage } from "@/components/progress/WeeklyReviewPage";

export default async function Page({ params }: { params: Promise<{ checkInId: string }> }) {
  const { checkInId } = await params;
  return <WeeklyReviewPage checkInId={checkInId} />;
}
