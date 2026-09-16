export function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  return (
    <div className="w-full">
      <p className="mb-2 text-center font-heading text-sm font-semibold text-asight-dark">
        Créa {current} / {total}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-asight-lavande">
        <div
          className="h-full rounded-full bg-asight-violet transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
