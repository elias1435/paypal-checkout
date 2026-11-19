// Shared between server and the admin settings form (no server-only imports).

export const TEXT_FIELDS = [
  { key: "secureBadge", label: "פס אבטחה מתחת לכותרת", def: "תשלום מאובטח באמצעות PayPal" },
  { key: "amountLabel", label: "כותרת שדה הסכום", def: "סכום לתשלום" },
  { key: "amountPlaceholder", label: "טקסט ריק בשדה הסכום", def: "0" },
  { key: "amountError", label: "שגיאה – סכום לא תקין", def: "יש להזין סכום גדול מ-0" },
  { key: "nameLabel", label: "כותרת שדה השם", def: "שם מלא" },
  { key: "namePlaceholder", label: "טקסט ריק בשדה השם", def: "ישראל ישראלי" },
  { key: "nameError", label: "שגיאה – שם חסר", def: "יש להזין שם מלא" },
  { key: "emailLabel", label: "כותרת שדה האימייל", def: "אימייל" },
  { key: "emailPlaceholder", label: "טקסט ריק בשדה האימייל", def: "name@example.com" },
  { key: "emailError", label: "שגיאה – אימייל לא תקין", def: "כתובת אימייל לא תקינה" },
  { key: "phoneLabel", label: "כותרת שדה הטלפון", def: "טלפון" },
  { key: "phonePlaceholder", label: "טקסט ריק בשדה הטלפון", def: "050-0000000" },
  { key: "optionalText", label: "סימון שדה לא חובה", def: "(לא חובה)" },
  { key: "totalLabel", label: "כותרת הסכום הכולל", def: 'סה"כ לתשלום' },
  { key: "fillHint", label: "הנחיה לפני מילוי הטופס", def: "יש למלא סכום, שם ואימייל כדי להמשיך לתשלום" },
  { key: "footerNote", label: "הערה בתחתית הטופס", def: "פרטי האשראי מוזנים בטופס המאובטח של PayPal ואינם נשמרים באתר זה" },
  { key: "successTitle", label: "כותרת אחרי תשלום מוצלח", def: "התשלום התקבל בהצלחה" },
  { key: "successMessage", label: "הודעה אחרי תשלום ({name} = שם הלקוח)", def: "תודה {name}! קבלה תישלח אליך במייל מ-PayPal." },
  { key: "referenceLabel", label: "כותרת מספר האסמכתא", def: "מספר אסמכתא:" },
  { key: "declinedError", label: "שגיאה – תשלום נדחה", def: "התשלום נדחה. נסו אמצעי תשלום אחר." },
  { key: "failedError", label: "שגיאה – תשלום נכשל", def: "התשלום נכשל. נסו שוב." },
] as const;

export type TextKey = (typeof TEXT_FIELDS)[number]["key"];
export const CURRENCIES = ["ILS", "USD", "EUR", "GBP"] as const;
export const LOGO_MODES = ["icon", "banner", "none"] as const;

export type Settings = {
  siteName: string;
  subtitle: string;
  showSiteName: boolean;
  logoMode: (typeof LOGO_MODES)[number]; // icon = small logo above name, banner = image fills header
  colorFrom: string;
  colorTo: string;
  currency: (typeof CURRENCIES)[number];
  showPhone: boolean;
  texts: Record<TextKey, string>;
};

export const DEFAULT_SETTINGS: Settings = {
  siteName: "תשלום מאובטח",
  subtitle: "",
  showSiteName: true,
  logoMode: "icon",
  colorFrom: "#4f46e5",
  colorTo: "#7c3aed",
  currency: "ILS",
  showPhone: true,
  texts: Object.fromEntries(TEXT_FIELDS.map((f) => [f.key, f.def])) as Record<TextKey, string>,
};

const str = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" ? v.trim().slice(0, max) : fallback;
const color = (v: unknown, fallback: string) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

/** Validate untrusted input and fill gaps from `base`. Empty texts fall back to the default. */
export function sanitizeSettings(input: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const t = (i.texts && typeof i.texts === "object" ? i.texts : {}) as Record<string, unknown>;
  return {
    siteName: str(i.siteName, 80, base.siteName) || DEFAULT_SETTINGS.siteName,
    subtitle: str(i.subtitle, 120, base.subtitle),
    showSiteName: typeof i.showSiteName === "boolean" ? i.showSiteName : base.showSiteName,
    logoMode: oneOf(i.logoMode, LOGO_MODES, base.logoMode),
    colorFrom: color(i.colorFrom, base.colorFrom),
    colorTo: color(i.colorTo, base.colorTo),
    currency: oneOf(i.currency, CURRENCIES, base.currency),
    showPhone: typeof i.showPhone === "boolean" ? i.showPhone : base.showPhone,
    texts: Object.fromEntries(
      TEXT_FIELDS.map((f) => [f.key, str(t[f.key], 300, base.texts[f.key] ?? f.def) || f.def])
    ) as Record<TextKey, string>,
  };
}
