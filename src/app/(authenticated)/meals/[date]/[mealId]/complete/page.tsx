import { MealComplete } from "@/components/nutrition/MealComplete";

export default async function MealCompletePage({
  params
}: {
  params: Promise<{ date: string; mealId: string }>;
}) {
  const { date, mealId } = await params;
  return <MealComplete date={date} mealId={mealId} />;
}
