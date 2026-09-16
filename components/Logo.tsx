export function Logo({
  className = '',
  variant = 'violet',
}: {
  className?: string;
  variant?: 'violet' | 'white';
}) {
  return (
    <span
      className={`font-heading font-bold text-2xl select-none ${
        variant === 'white' ? 'text-white' : 'text-asight-violet'
      } ${className}`}
    >
      ASight
    </span>
  );
}
