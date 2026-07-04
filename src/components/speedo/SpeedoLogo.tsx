import { useBrandLogo } from "@/hooks/useBrandSettings";

type Props = { size?: number; className?: string; variant?: "filled" | "mark" };

/**
 * SpeedoLogo renders the brand wordmark loaded from admin app_settings
 * (`brand.logo_url`), falling back to the bundled default asset. The `mark`
 * variant keeps the historical square SVG "o" for tight spaces.
 */
export function SpeedoLogo({ size = 36, className = "", variant = "filled" }: Props) {
  const src = useBrandLogo();
  if (variant === "mark") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-label="Logo">
        <path
          d="M40 24a16 16 0 1 1-32 0 16 16 0 0 1 32 0Zm-16-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-7 17h14l-7 6-7-6Z"
          fill="hsl(var(--primary))"
        />
      </svg>
    );
  }
  return (
    <img
      src={src}
      alt="Logo"
      height={size}
      style={{ height: size, width: "auto", maxHeight: size }}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}

export function SpeedoWordmark({ className = "" }: { className?: string }) {
  return <SpeedoLogo size={32} className={className} />;
}