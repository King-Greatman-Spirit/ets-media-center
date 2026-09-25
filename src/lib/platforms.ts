export type PlatformId =
  | "youtube_shorts"
  | "tiktok"
  | "instagram_reels"
  | "facebook"
  | "threads"
  | "linkedin"
  | "x"
  | "telegram"
  | "substack";

export type CredentialField = {
  key: string;
  label: string;
  secret?: boolean;
  hint?: string;
};

export type Platform = {
  id: PlatformId;
  name: string;
  short: string;
  /** brand hue rendered via inline style (data-driven brand color) */
  color: string;
  charLimit: number;
  format: string;
  docsUrl: string;
  fields: CredentialField[];
};

export const PLATFORMS: Platform[] = [
  {
    id: "youtube_shorts",
    name: "YouTube Shorts",
    short: "YT",
    color: "oklch(0.62 0.24 27)",
    charLimit: 100,
    format: "Title ≤100 chars, description with timestamps, 3-5 hashtags, vertical 9:16 ≤60s",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    fields: [
      { key: "client_id", label: "OAuth Client ID" },
      { key: "client_secret", label: "OAuth Client Secret", secret: true },
      { key: "refresh_token", label: "Refresh Token", secret: true, hint: "From a completed OAuth consent" },
      { key: "channel_id", label: "Channel ID" },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    short: "TT",
    color: "oklch(0.78 0.14 190)",
    charLimit: 2200,
    format: "Hook in first line, 3-6 trending hashtags, punchy, vertical 9:16",
    docsUrl: "https://developers.tiktok.com/",
    fields: [
      { key: "client_key", label: "Client Key" },
      { key: "client_secret", label: "Client Secret", secret: true },
      { key: "access_token", label: "Access Token", secret: true },
    ],
  },
  {
    id: "instagram_reels",
    name: "Instagram Reels",
    short: "IG",
    color: "oklch(0.66 0.24 350)",
    charLimit: 2200,
    format: "Caption with line breaks, CTA, up to 30 hashtags (5-10 ideal), vertical 9:16",
    docsUrl: "https://developers.facebook.com/apps/",
    fields: [
      { key: "app_id", label: "Meta App ID" },
      { key: "app_secret", label: "Meta App Secret", secret: true },
      { key: "access_token", label: "Long-lived Access Token", secret: true },
      { key: "ig_user_id", label: "Instagram Business Account ID" },
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    short: "FB",
    color: "oklch(0.6 0.19 260)",
    charLimit: 63206,
    format: "Conversational, 1-3 short paragraphs, 1-3 hashtags, link or video",
    docsUrl: "https://developers.facebook.com/apps/",
    fields: [
      { key: "page_id", label: "Page ID" },
      { key: "page_access_token", label: "Page Access Token", secret: true },
    ],
  },
  {
    id: "threads",
    name: "Threads",
    short: "TH",
    color: "oklch(0.85 0 0)",
    charLimit: 500,
    format: "≤500 chars, casual, one idea per post, optional thread continuation",
    docsUrl: "https://developers.facebook.com/docs/threads",
    fields: [
      { key: "user_id", label: "Threads User ID" },
      { key: "access_token", label: "Access Token", secret: true },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    short: "LI",
    color: "oklch(0.58 0.14 240)",
    charLimit: 3000,
    format: "Professional hook, short paragraphs, insight + takeaway, 3-5 hashtags",
    docsUrl: "https://www.linkedin.com/developers/apps",
    fields: [
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client Secret", secret: true },
      { key: "access_token", label: "Access Token", secret: true },
      { key: "organization_urn", label: "Organization URN", hint: "e.g. urn:li:organization:12345" },
    ],
  },
  {
    id: "x",
    name: "X",
    short: "X",
    color: "oklch(0.95 0 0)",
    charLimit: 280,
    format: "≤280 chars, sharp hook, 1-2 hashtags max, optional thread",
    docsUrl: "https://developer.x.com/en/portal/dashboard",
    fields: [
      { key: "api_key", label: "API Key" },
      { key: "api_secret", label: "API Secret", secret: true },
      { key: "access_token", label: "Access Token", secret: true },
      { key: "access_secret", label: "Access Token Secret", secret: true },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    short: "TG",
    color: "oklch(0.72 0.13 230)",
    charLimit: 4096,
    format: "Broadcast style, bold headline, emojis sparingly, direct link, no hashtags needed",
    docsUrl: "https://core.telegram.org/bots#botfather",
    fields: [
      { key: "bot_token", label: "Bot Token", secret: true, hint: "From @BotFather" },
      { key: "chat_id", label: "Channel / Chat ID", hint: "e.g. @yourchannel or -100…" },
    ],
  },
  {
    id: "substack",
    name: "Substack",
    short: "SS",
    color: "oklch(0.72 0.19 45)",
    charLimit: 20000,
    format: "Newsletter: subject line, preview text, long-form body with headers, closing CTA",
    docsUrl: "https://substack.com/",
    fields: [
      { key: "publication_url", label: "Publication URL" },
      { key: "session_cookie", label: "Session Cookie / API Token", secret: true },
    ],
  },
];

export const PLATFORM_MAP: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
);

export const platformById = (id: string): Platform | undefined => PLATFORM_MAP[id];
