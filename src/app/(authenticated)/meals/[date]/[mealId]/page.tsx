import { MealDetail } from "@/components/nutrition/MealDetail";

export default async function MealDetailPage({
  params
}: {
  params: Promise<{ date: string; mealId: string }>;
}) {
  const { date, mealId } = await params;
  return <MealDetail date={date} mealId={mealId} />;
}
