import logoAsset from "@/assets/speedo-logo.png.asset.json";
const logoImg = logoAsset.url;

type Props = { size?: number; className?: string; variant?: "filled" | "mark" };

/**
 * SpeedoLogo renders the official brand wordmark. The `mark` variant returns
 * a square icon-only crop (right portion of the asset) for tight spaces.
 */
export function SpeedoLogo({ size = 36, className = "", variant = "filled" }: Props) {
  if (variant === "mark") {
    // Icon-only — render as a square purple "o" mark using the brand color.
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-label="Speedo">
        <path
          d="M40 24a16 16 0 1 1-32 0 16 16 0 0 1 32 0Zm-16-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-7 17h14l-7 6-7-6Z"
          fill="hsl(var(--primary))"
        />
      </svg>
    );
  }
  // Full wordmark: keep aspect ratio (~3.6:1 from asset), use height = size.
  return (
    <img
      src={logoImg}
      alt="Speedo"
      height={size}
      style={{ height: size, width: "auto" }}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}

export function SpeedoWordmark({ className = "" }: { className?: string }) {
  return <SpeedoLogo size={32} className={className} />;
}