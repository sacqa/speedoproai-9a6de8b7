import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-3xl p-2.5 sm:p-3 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)]">
      <Skeleton className="aspect-square rounded-2xl" />
      <div className="pt-3 px-1 pb-1 space-y-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid-products">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryChipSkeleton() {
  return (
    <div className="flex-shrink-0 w-[68px] sm:w-20 lg:w-24 text-center">
      <Skeleton className="aspect-square w-full rounded-3xl" />
      <Skeleton className="mt-2 h-3 w-16 mx-auto" />
    </div>
  );
}

export function CategoryRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 sm:gap-4 lg:gap-5 px-4 lg:px-0 pb-2 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryChipSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryTabsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-1 min-w-max pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 px-4 sm:px-5 py-2.5 min-w-[72px]">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SectionSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section>
      <Skeleton className="h-5 w-32 mb-3" />
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5 sm:gap-3 lg:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="w-full aspect-square rounded-2xl" />
            <Skeleton className="mt-2 h-3 w-3/4" />
            <Skeleton className="mt-1 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function GallerySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square lg:h-[520px] lg:rounded-3xl" />
      <div className="flex gap-2 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** A graceful <img> wrapper that reserves space, shows a skeleton, and fades in on load. */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  fallback = "/placeholder.svg",
  rounded = "rounded-xl",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback?: string;
  rounded?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-muted ${rounded} ${className ?? ""}`}>
      <Skeleton className="absolute inset-0" />
      <img
        src={src || fallback}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = "1";
        }}
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          if (el.src.indexOf(fallback) === -1) el.src = fallback;
          el.style.opacity = "1";
        }}
        style={{ opacity: 0, transition: "opacity 350ms ease" }}
        className={`relative h-full w-full object-cover ${imgClassName ?? ""}`}
      />
    </div>
  );
}