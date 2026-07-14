type QuickIncrementControlProps = {
  label: string;
  addLabel: string;
  undoLabel: string;
  onAdd: () => void;
  onUndo: () => void;
  undoDisabled: boolean;
};

export function QuickIncrementControl({
  label,
  addLabel,
  undoLabel,
  onAdd,
  onUndo,
  undoDisabled
}: QuickIncrementControlProps) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-2"
      role="group"
      aria-label={`${label} quick actions`}
    >
      <span className="text-xs font-bold uppercase text-suii-muted">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="focus-ring min-h-10 rounded-lg bg-white/10 px-3 text-xs font-black uppercase text-white"
        >
          {addLabel}
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          className="focus-ring min-h-10 rounded-lg border border-white/10 px-3 text-xs font-black uppercase text-suii-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          {undoLabel}
        </button>
      </div>
    </div>
  );
}
