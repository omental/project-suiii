import { FormGuidePage } from "@/components/training/FormGuidePage";

export default async function ExerciseFormGuideRoute({ params }: { params: Promise<{ sessionId: string; exerciseId: string }> }) {
  const { sessionId, exerciseId } = await params;
  return <FormGuidePage sessionId={sessionId} exerciseId={exerciseId} />;
}
