import { WorkoutCompletePage } from "@/components/training/WorkoutCompletePage";

export default async function WorkoutCompleteRoute({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <WorkoutCompletePage sessionId={sessionId} />;
}
