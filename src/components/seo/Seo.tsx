import { Helmet } from "react-helmet-async";

const SITE = "https://speedoproai.lovable.app";

type Props = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown>;
};

export function Seo({ title, description, path = "/", image, type = "website", jsonLd }: Props) {
  const url = `${SITE}${path}`;
  const full = title.length > 60 ? title.slice(0, 57) + "…" : title;
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description.slice(0, 158)} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description.slice(0, 158)} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}