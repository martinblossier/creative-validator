export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-heading font-bold text-2xl text-asight-violet select-none ${className}`}
    >
      ASight
    </span>
  );
}
