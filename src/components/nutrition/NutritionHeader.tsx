import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function NutritionHeader({
  eyebrow = "Project SUIII",
  title,
  subtitle,
  action
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" className="focus-ring -ml-2 grid size-11 place-items-center rounded-full text-suii-lime" aria-label="Back to Today">
          <ArrowLeft className="size-7" aria-hidden="true" />
        </Link>
        <p className="display flex-1 text-lg tracking-[0.18em] text-white/80">{eyebrow}</p>
        {action ?? <span className="size-11" aria-hidden="true" />}
      </div>
      <h1 className="display text-[3.7rem] leading-[0.9] text-white">{title}</h1>
      {subtitle ? <p className="mt-3 text-lg font-bold uppercase text-suii-muted">{subtitle}</p> : null}
    </header>
  );
}
