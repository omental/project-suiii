import { WeighingWorkflow } from "@/components/nutrition/WeighingWorkflow";

export default async function WeighingPage({
  params
}: {
  params: Promise<{ date: string; mealId: string }>;
}) {
  const { date, mealId } = await params;
  return <WeighingWorkflow date={date} mealId={mealId} />;
}
