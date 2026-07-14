import { BottomNavigation } from "@/components/BottomNavigation";

export function AppShell({ children, hideNavigation = false }: { children: React.ReactNode; hideNavigation?: boolean }) {
  return (
    <main className="min-h-screen px-3 py-0 sm:px-6 sm:py-8">
      <div
        className={`mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-suii-black ${
          hideNavigation ? "pb-[calc(1.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
        } sm:min-h-0 sm:rounded-[28px] sm:border sm:border-white/10 sm:shadow-suii`}
      >
        {children}
        {hideNavigation ? null : <BottomNavigation />}
      </div>
    </main>
  );
}
