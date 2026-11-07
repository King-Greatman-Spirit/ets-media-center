# ETS — Official Platform API Setup Guide

Goal: connect each social account to ETS through its **official API** so ETS can post
(and in most cases schedule) without subscriptions. Start at the top and work down —
Telegram first because it already auto-posts today.

> **Honest note:** getting the API keys is step 1. ETS currently **auto-posts only to
> Telegram**. For the others, ETS stores the credentials in Connections and generates
> everything (clip, thumbnail, caption). The actual posting integration per platform
> gets built once its keys exist. Until then, use the **Post button** on each caption
> card (opens that platform logged-in for manual posting — free, always works).

---

## 1. Telegram — FREE, works today ✅ (do this first, 10 minutes)

Already auto-publishes. You only need a bot token + channel.

1. Open Telegram, search **@BotFather** → send `/newbot` → name it e.g. "ETS Publisher"
   → copy the **HTTP API token** (`123456:ABC-DEF...`).
2. Create your channel (right-click saved messages / menu → New Channel), e.g. `@EndTimeSoldiers`.
3. Add the bot as **admin** of the channel (Channel settings → Administrators → add bot, allow *Post messages*).
4. Send the bot any message in a DM so it "knows" you (activates it).
5. In ETS → **Connections → Telegram**, paste:
   - `bot_token` = the token from BotFather
   - `chat_id` = `@EndTimeSoldiers` (or the numeric `-100...` id)
6. Test: cut any clip, tick **Telegram**, and it posts itself.

## 2. YouTube Shorts — FREE (quota), needs Google verification

1. Go to **console.cloud.google.com** → create a project, e.g. "ETS Media".
2. **APIs & Services → Enable APIs** → enable **YouTube Data API v3**.
3. **APIs & Services → OAuth consent screen** → External → fill app name "ETS Media
   Command Center", your email. Add scope
   `https://www.googleapis.com/auth/youtube.upload`. Non-sensitive scopes are fine.
4. **Credentials → Create Credentials → OAuth client ID → Desktop app** → copy
   `client_id` + `client_secret`.
5. **OAuth consent screen → Test users** → add your own Gmail (so *you* can use it
   immediately with no review).
6. To publish to the **public** (not just test users), Google requires verification —
   for `youtube.upload` scope this means an audit + a privacy policy URL. That takes
   days, costs nothing, and is a one-time process.
7. In ETS → **Connections → YouTube Shorts**, paste `client_id`, `client_secret`,
   and the `refresh_token` from the OAuth flow (Google's OAuth Playground
   `developers.google.com/oauthplayground` → Settings → "Use your own OAuth
   credentials" → enter client id/secret → Authorize `youtube.upload` → exchange
   code → copy refresh token). `channel_id` = your channel ID (YouTube Studio →
   Settings → Channel → Advanced → Channel ID).

## 3. Facebook + Instagram + Threads — FREE (Meta), needs Business verification

One Meta developer app covers all three.

1. Go to **developers.facebook.com** → **Create App** → type **Business** →
   name "ETS Media". Note the **App ID** + **App Secret**.
2. **Add Products** → enable **Instagram** (for Reels), **Facebook Login**, and
   **Threads** (if available in your region).
3. **Settings → Basic** → add your **Privacy Policy URL** (a simple page on your
   site stating what data ETS collects — required for review).
4. **Business Settings (business.facebook.com)** → create/claim your **Business**
   account → add your Facebook **Page** → also link your **Instagram Business/
   Creator account** (must be a Business or Creator account, not personal) to the Page.
5. **App Review** → request permissions: `pages_manage_posts`, `pages_read_engagement`,
   `instagram_basic`, `instagram_content_publish` (Reels), `instagram_manage_insights`
   optional. **Business verification** (upload ministry registration / utility bill) is
   required before approval — free, takes a few days.
6. Get a **long-lived Page access token** (Graph API Explorer → select your app →
   generate user token → exchange for long-lived → `debug_token` → get Page token).
   Long-lived tokens last ~60 days and renew by re-logging in.
7. In ETS → **Connections**:
   - **Facebook**: `page_id` + `page_access_token`
   - **Instagram Reels**: `app_id`, `app_secret`, `access_token` (long-lived),
     `ig_user_id` (Instagram Settings → About → user ID, or via Graph API Explorer
     `/{page-id}?fields=instagram_business_account`)
   - **Threads**: `user_id` (Threads profile ID) + `access_token` (from the Threads
     API app in the same Meta app)

## 4. TikTok — FREE to apply, approval needed

1. Go to **developers.tiktok.com** → sign in → **Manage apps → Create app** →
   name "ETS Media". Note **Client Key** + **Client Secret**.
2. In the app → **Products → Content Posting API** → request access. TikTok reviews
   the app (audit) before it can post publicly — free, but it takes time and they
   ask what the app does. Until approved, only the app owner's own account (test
   user) can post, and only as **private** drafts.
3. **Settings → URL_phone**… (Authorization URL / Redirect URI): set to your ETS
   address (e.g. `http://localhost:5173/auth/callback` for testing).
4. Obtain an **access token** via OAuth: visit
   `https://www.tiktok.com/v2/auth/authorize/?client_key=YOUR_KEY&scope=video.upload,video.publish&redirect_uri=...`
   → log in → copy the `code` → exchange at
   `https://open.tiktokapis.com/v2/oauth/token/` (form-encoded:
   `client_key, client_secret, code, grant_type=authorization_code, redirect_uri`).
5. In ETS → **Connections → TikTok**: `client_key`, `client_secret`, `access_token`.
   (Tokens expire — refresh with `grant_type=refresh_token`.)

## 5. LinkedIn — FREE app, posting needs approval

1. Go to **linkedin.com/developers** → **Create app** → name "ETS Media" →
   link it to your ministry **Company Page** (required for posting to a Page).
2. **Auth** → note **Client ID** + **Primary Client Secret**.
3. **Products** → request **Share on LinkedIn** (posting permission) — LinkedIn
   reviews it (free, can take weeks; you can post to your own Page as admin sooner
   via the "test" path in some cases).
4. **OAuth 2.0** → add redirect URL (your ETS callback) → build the auth URL:
   `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&scope=openid w_member_social admin`
   → exchange the code at `https://www.linkedin.com/oauth/v2/accessToken`
   (form: `grant_type=authorization_code, code, client_id, client_secret, redirect_uri`).
5. Your **Organization URN** is `urn:li:organization:{page-id}` (Page Admin tools →
   Settings → Page ID).
6. In ETS → **Connections → LinkedIn**: `client_id`, `client_secret`,
   `access_token`, `organization_urn`.

## 6. X (Twitter) — ⚠️ PAID for posting. Skip for now.

- The **Free tier** is read-only — it cannot post. Posting requires the paid
  **Basic tier** (~$100/month) or higher.
- **Recommendation:** don't pay. Post to X manually with the ETS **Post button**
  (caption + clip already prepared). Revisit only if X becomes a priority channel.
- If you ever do it: **developer.x.com** → Free project → upgrade → create app →
  set permissions to **Read and write** → generate API Key + Secret, Access Token +
  Secret → paste into ETS → **Connections → X**.

---

## Suggested order (start publishing today)

1. **Telegram** (10 min, auto-posts today)
2. **YouTube** — OAuth + test user works same day; public-posting verification in background
3. **Meta (FB/IG/Threads)** — one app, one review, covers three platforms
4. **TikTok** — apply now; test-user posting works while the audit runs
5. **LinkedIn** — apply; slowest review
6. **X** — skip (paid); manual via Post button

While any API is pending, the **Post button** path (Copy caption → open platform →
paste → upload clip) costs nothing and works on all 8 platforms today.
