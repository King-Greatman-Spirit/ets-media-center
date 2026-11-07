import type { PlatformId } from "@/lib/platforms";

// Step-by-step setup guides shown in the Connections page popup.
// Keep each step short and in plain language — these are read by non-technical
// ministry staff. Links point at the official consoles.

export type GuideLink = { label: string; url: string };

export type PlatformGuide = {
  platform: PlatformId;
  cost: string;
  time: string;
  worksToday: boolean;
  steps: string[];
  links: GuideLink[];
  note?: string;
};

export const GUIDES: Record<PlatformId, PlatformGuide> = {
  telegram: {
    platform: "telegram",
    cost: "Free",
    time: "10 minutes",
    worksToday: true,
    steps: [
      "Open Telegram and search for @BotFather, then send /newbot.",
      "Name your bot (e.g. “ETS Publisher”) and copy the token BotFather gives you — it looks like 123456:ABC-DEF... .",
      "Create your channel (New Channel), e.g. @EndTimeSoldiers.",
      "Add the bot as an Admin of the channel and allow “Post messages”.",
      "Send the bot any message in a direct chat so it activates.",
      "Back in ETS, click Connect, paste bot_token and chat_id (@yourchannel), then Save.",
      "Cut any clip, tick Telegram, and ETS posts it for you automatically.",
    ],
    links: [
      { label: "Open @BotFather in Telegram", url: "https://t.me/BotFather" },
      { label: "Telegram Bot API docs", url: "https://core.telegram.org/bots#botfather" },
    ],
    note: "Telegram is the only channel that auto-posts today — everything else posts manually via the Post button until its API is approved.",
  },
  youtube_shorts: {
    platform: "youtube_shorts",
    cost: "Free (API quota)",
    time: "Same day for test posting; public-posting approval takes days",
    worksToday: false,
    steps: [
      "Go to Google Cloud Console and create a project, e.g. “ETS Media”.",
      "APIs & Services → Enable APIs → turn on YouTube Data API v3.",
      "OAuth consent screen → External → name it “ETS Media Command Center” and add the scope https://www.googleapis.com/auth/youtube.upload.",
      "Credentials → Create Credentials → OAuth client ID → Desktop app. Copy the Client ID and Client Secret.",
      "OAuth consent screen → Test users → add your own Gmail so you can use it immediately, no review needed.",
      "Get a refresh token: open Google OAuth Playground → Settings → “Use your own OAuth credentials” → enter the client ID/secret → Authorize the youtube.upload scope → exchange the code → copy the refresh token.",
      "Find your Channel ID in YouTube Studio → Settings → Channel → Advanced.",
      "Back in ETS, click Connect and paste client_id, client_secret, refresh_token and channel_id.",
    ],
    links: [
      { label: "Google Cloud Console", url: "https://console.cloud.google.com/" },
      { label: "YouTube Data API docs", url: "https://developers.google.com/youtube/v3/docs" },
      { label: "Google OAuth Playground", url: "https://developers.google.com/oauthplayground" },
    ],
    note: "Posting publicly (not just as yourself) needs Google's verification/audit — free and one-time, but it takes days. Test-user posting works the same day.",
  },
  facebook: {
    platform: "facebook",
    cost: "Free (one Meta app covers FB + IG + Threads)",
    time: "A few days (business verification + app review)",
    worksToday: false,
    steps: [
      "Go to Meta for Developers and create an app of type Business, named “ETS Media”. Note the App ID and App Secret.",
      "Add Products → Facebook Login (and Instagram + Threads — one app covers all three).",
      "Settings → Basic → add a Privacy Policy URL (a short page stating what data ETS collects — required for review).",
      "In Business Settings, create/claim your Business account and add your Facebook Page.",
      "App Review → request pages_manage_posts and pages_read_engagement.",
      "Complete Business Verification (upload ministry registration or a utility bill) — free, takes a few days.",
      "Get a long-lived Page token: Graph API Explorer → select your app → generate a user token → use the Access Token Debugger to exchange it for a long-lived token, then generate the Page token from it. Long-lived tokens last about 60 days.",
      "Back in ETS, click Connect and paste page_id and page_access_token.",
    ],
    links: [
      { label: "Meta for Developers", url: "https://developers.facebook.com/" },
      { label: "Graph API Explorer", url: "https://developers.facebook.com/tools/explorer/" },
      { label: "Meta Business Settings", url: "https://business.facebook.com/settings" },
    ],
  },
  instagram_reels: {
    platform: "instagram_reels",
    cost: "Free (same Meta app as Facebook)",
    time: "A few days (shared with Facebook review)",
    worksToday: false,
    steps: [
      "Your Instagram account must be a Business or Creator account (not personal). Switch it in Instagram → Settings → Account type.",
      "Link the Instagram account to your Facebook Page (Page → Settings → Linked Accounts).",
      "In your Meta developer app, add the Instagram product.",
      "App Review → request instagram_basic and instagram_content_publish (for Reels).",
      "Find your Instagram user ID: Graph API Explorer → GET /{page-id}?fields=instagram_business_account.",
      "Use the same long-lived token process as Facebook (see the Facebook guide) — one token covers both.",
      "Back in ETS, click Connect and paste app_id, app_secret, access_token and ig_user_id.",
    ],
    links: [
      { label: "Meta for Developers", url: "https://developers.facebook.com/" },
      { label: "Instagram Content Publishing API", url: "https://developers.facebook.com/docs/instagram-platform/content-publishing" },
    ],
    note: "Instagram can only be connected through a Facebook Page — you cannot link a standalone personal account.",
  },
  threads: {
    platform: "threads",
    cost: "Free (same Meta app)",
    time: "A few days (shared with Facebook review)",
    worksToday: false,
    steps: [
      "In your Meta developer app, add the Threads product (availability varies by region).",
      "App Review → request the Threads posting permissions.",
      "Find your Threads user ID (your Threads profile ID).",
      "Generate an access token for the Threads app (same long-lived token flow as Facebook).",
      "Back in ETS, click Connect and paste user_id and access_token.",
    ],
    links: [
      { label: "Meta for Developers", url: "https://developers.facebook.com/" },
      { label: "Threads API docs", url: "https://developers.facebook.com/docs/threads" },
    ],
    note: "If Threads is not available in your region yet, skip this one — Facebook and Instagram use the same app.",
  },
  tiktok: {
    platform: "tiktok",
    cost: "Free to apply",
    time: "Test posting same day; public-posting approval takes time",
    worksToday: false,
    steps: [
      "Go to TikTok Developers and sign in (use a real account).",
      "Manage apps → Create app → name it “ETS Media”. Note the Client Key and Client Secret.",
      "Products → Content Posting API → request access. TikTok audits the app (free) before public posting.",
      "Until approval, only your own account can post — and only as private drafts. That is enough to test.",
      "Settings → add your redirect URI (your ETS address, e.g. http://localhost:5173/auth/callback).",
      "Get an access token: open the authorize link with your client key and scopes video.upload,video.publish → log in → copy the code → exchange it at the token endpoint (form: client_key, client_secret, code, grant_type=authorization_code, redirect_uri).",
      "Back in ETS, click Connect and paste client_key, client_secret and access_token. Tokens expire — refresh them with grant_type=refresh_token.",
    ],
    links: [
      { label: "TikTok Developers", url: "https://developers.tiktok.com/" },
      { label: "Content Posting API docs", url: "https://developers.tiktok.com/doc/content-posting-api-reference" },
    ],
  },
  linkedin: {
    platform: "linkedin",
    cost: "Free app",
    time: "Posting approval can take weeks — apply early",
    worksToday: false,
    steps: [
      "Go to LinkedIn Developers → Create app → name it “ETS Media” and link it to your ministry Company Page (required for Page posting).",
      "Auth → note the Client ID and Primary Client Secret.",
      "Products → request “Share on LinkedIn” (the posting permission). LinkedIn reviews it — free, but slow.",
      "OAuth 2.0 → add your redirect URL (your ETS callback address).",
      "Build the login link: https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_ID&redirect_uri=YOUR_URL&scope=openid w_member_social admin — open it, log in, copy the code.",
      "Exchange the code at https://www.linkedin.com/oauth/v2/accessToken (form: grant_type=authorization_code, code, client_id, client_secret, redirect_uri) to get the access token.",
      "Your Organization URN is urn:li:organization: followed by your Page ID (Page Admin → Settings → Page ID).",
      "Back in ETS, click Connect and paste client_id, client_secret, access_token and organization_urn.",
    ],
    links: [
      { label: "LinkedIn Developers", url: "https://www.linkedin.com/developers/apps" },
      { label: "LinkedIn API docs", url: "https://learn.microsoft.com/en-us/linkedin/" },
    ],
  },
  x: {
    platform: "x",
    cost: "PAID for posting (~$100/month Basic tier) — skip for now",
    time: "—",
    worksToday: false,
    steps: [
      "X's free API tier is read-only. It cannot post.",
      "Posting requires the paid Basic tier or higher.",
      "Recommendation: do not pay. Use the ETS Post button to open X with your caption copied and post manually.",
      "If X ever becomes a priority: go to developer.x.com → create a project → upgrade → create an app → set permissions to Read and write → generate API Key + Secret and Access Token + Secret → paste all four into ETS → Connections → X.",
    ],
    links: [
      { label: "X Developer Portal", url: "https://developer.x.com/en/portal/dashboard" },
      { label: "X API pricing", url: "https://developer.x.com/en/products/twitter-api/pricing" },
    ],
    note: "This is the one platform where the official route costs money. Everything else above is free.",
  },
};
