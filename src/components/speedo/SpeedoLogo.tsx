type Props = { size?: number; className?: string; variant?: "filled" | "mark" };

export function SpeedoLogo({ size = 36, className = "", variant = "filled" }: Props) {
  if (variant === "mark") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-label="Speedo">
        <path
          d="M27 4 12 27h9l-3 17 18-23h-9l3-17z"
          fill="hsl(var(--primary))"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-label="Speedo">
      <rect width="48" height="48" rx="12" fill="url(#sg)" />
      <path d="M27 8 14 28h8l-3 12 17-20h-8l3-12z" fill="white" />
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--primary-dark))" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SpeedoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SpeedoLogo size={32} />
      <span className="text-xl font-extrabold tracking-tight text-foreground">Speedo</span>
    </div>
  );
}