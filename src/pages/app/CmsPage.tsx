import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";

type Props = { slug: "about" | "contact" | "careers" | "privacy" | "terms" };

const FALLBACK_TITLES: Record<Props["slug"], string> = {
  about: "About",
  contact: "Contact",
  careers: "Careers",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

export default function CmsPage({ slug }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cms_pages", slug],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Realtime: admin edits appear instantly without a refresh.
  useEffect(() => {
    const ch = supabase
      .channel(`cms-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cms_pages", filter: `slug=eq.${slug}` },
        () => qc.invalidateQueries({ queryKey: ["cms_pages", slug] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [slug, qc]);

  const title = data?.title ?? FALLBACK_TITLES[slug];
  const subtitle = data?.subtitle ?? "";
  const hero = data?.hero_image_url as string | undefined;
  const content = data?.content ?? "";
  const desc = data?.meta_description ?? `${title} — Speedo`;

  return (
    <div className="px-4 lg:px-0 pb-12">
      <Seo
        title={`${title} — Speedo`}
        description={desc}
        path={`/${slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description: desc,
        }}
      />

      {/* Glass hero */}
      <header className="relative mx-auto max-w-5xl mt-3 lg:mt-6 rounded-[28px] overflow-hidden border border-white/40 shadow-[0_20px_45px_-22px_hsl(var(--primary)/0.55)]">
        <div
          className="aspect-[2/1] sm:aspect-[3/1] w-full bg-gradient-to-br from-primary via-primary-dark to-accent"
          style={hero ? { backgroundImage: `url(${hero})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-10 text-white">
          <h1 className="font-display font-extrabold tracking-tight leading-[1.05] text-[clamp(24px,5.5vw,44px)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-white/90 text-[clamp(13px,2.5vw,17px)] max-w-2xl drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
              {subtitle}
            </p>
          )}
        </div>
      </header>

      {/* Content card */}
      <article className="mx-auto max-w-3xl mt-6 lg:mt-10">
        <div className="rounded-[24px] bg-white/85 backdrop-blur-xl border border-white/60 shadow-card p-5 sm:p-8 lg:p-10">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          ) : (
            <div className="prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}