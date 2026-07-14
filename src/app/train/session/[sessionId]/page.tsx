import { WorkoutPlayer } from "@/components/training/WorkoutPlayer";

export default async function WorkoutSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <WorkoutPlayer sessionId={sessionId} />;
}
