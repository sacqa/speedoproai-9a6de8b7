import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ImageOff } from "lucide-react";

export type GalleryImage = { id?: string; image_url: string };

export function ProductGallery({ images, alt, badge }: { images: GalleryImage[]; alt: string; badge?: React.ReactNode }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "start" });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", onSelect);
  }, [embla, onSelect]);

  const scrollTo = (i: number) => embla?.scrollTo(i);

  if (!images.length) {
    return (
      <div className="relative aspect-square lg:h-[560px] bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 lg:rounded-3xl flex items-center justify-center text-muted-foreground/50">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-10 w-10" />
          <span className="text-xs">No image</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square lg:h-[520px] bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 lg:rounded-3xl overflow-hidden">
        <div ref={emblaRef} className="h-full overflow-hidden">
          <div className="flex h-full">
            {images.map((img, idx) => (
              <div key={img.id ?? idx} className="relative flex-[0_0_100%] h-full flex items-center justify-center p-8 lg:p-12">
                <img
                  src={img.image_url}
                  alt={`${alt} ${idx + 1}`}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  className="max-h-full max-w-full object-contain drop-shadow-xl transition-opacity duration-500"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
        {badge && <div className="absolute bottom-4 left-4 z-10">{badge}</div>}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 z-10 flex gap-1.5 bg-white/85 backdrop-blur rounded-full px-2 py-1.5 shadow-sm">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === selected ? "bg-foreground w-5" : "bg-muted-foreground/40 w-1.5"}`}
              />
            ))}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {images.map((img, i) => (
            <button
              key={img.id ?? i}
              onClick={() => scrollTo(i)}
              className={`shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all bg-white ${
                i === selected ? "border-primary shadow-md scale-105" : "border-border/60 opacity-70 hover:opacity-100"
              }`}
              aria-label={`Image ${i + 1}`}
            >
              <img src={img.image_url} alt="" className="h-full w-full object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}