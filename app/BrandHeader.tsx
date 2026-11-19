import type { Settings } from "@/lib/settings-schema";

type Props = {
  settings: Pick<Settings, "siteName" | "subtitle" | "showSiteName" | "logoMode">;
  logoUrl: string | null;
  description?: string;
};

/** Header of the payment card. Used on the payment page and in the admin live preview. */
export default function BrandHeader({ settings, logoUrl, description }: Props) {
  const { siteName, subtitle, showSiteName, logoMode } = settings;
  const banner = logoMode === "banner" && logoUrl;
  const text = (showSiteName || subtitle || description) && (
    <div className="head-text">
      {showSiteName && <h1>{siteName}</h1>}
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {description && <p className="desc">{description}</p>}
    </div>
  );

  if (banner) {
    return (
      <div className="head head-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={siteName} className="banner-img" />
        {text}
      </div>
    );
  }

  return (
    <div className="head">
      {logoMode === "icon" &&
        (logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={siteName} className="logo-img" />
        ) : (
          <div className="logo" aria-hidden="true">₪</div>
        ))}
      {text}
    </div>
  );
}
