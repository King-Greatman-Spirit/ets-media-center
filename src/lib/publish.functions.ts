import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { PLATFORMS, platformById, type PlatformId } from "@/lib/platforms";
import { serverEnv } from "@/lib/server-env";

const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as [PlatformId, ...PlatformId[]];

const PublishInput = z.object({
  postId: z.string().uuid(),
  // Defaults to the post's own platform.
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1).max(9).optional(),
});

type PublishResult = { platform: PlatformId; url?: string | undefined };

/**
 * Publish a scheduled post right now to its connected platforms.
 * Only platforms flagged `autoPublish` can run; the rest need their own
 * developer apps/OAuth and fail with a plain-language message.
 */
export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PublishInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: post, error: postError } = await context.supabase
      .from("scheduled_posts")
      .select("id, title, content, platform, media_asset_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (postError) throw new Error(postError.message);
    if (!post) throw new Error("Post not found.");

    const targets = (data.platforms ?? [post.platform]) as PlatformId[];
    const results: PublishResult[] = [];

    try {
      for (const pid of targets) {
        const platform = platformById(pid);
        if (!platform) throw new Error(`Unknown platform: ${pid}.`);
        if (!platform.autoPublish) {
          throw new Error(
            `${platform.name} auto-posting is not live yet — copy the text from the Studio and paste it in the ${platform.name} app.`,
          );
        }

        const creds = await loadCredentials(context.supabase, pid);
        if (!creds["bot_token"]) {
          throw new Error(
            `${platform.name} is not connected. Open Connections and save your ${platform.name} credentials first.`,
          );
        }

        const media = await resolveMedia(context.supabase, post.media_asset_id);
        if (pid === "telegram") {
          const { publishToTelegram } = await import("@/lib/publish/telegram.server");
          const r = await publishToTelegram({
            botToken: creds["bot_token"] as string,
            chatId: (creds["chat_id"] as string) ?? "",
            title: post.title,
            body: post.content,
            media: media?.kind === "video" || media?.kind === "image" || media?.kind === "audio"
              ? { url: media.url, kind: media.kind }
              : null,
          });
          results.push({ platform: pid, url: r.url });
        } else {
          throw new Error(`${platform.name} auto-posting is not live yet.`);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Publishing failed.";
      await context.supabase
        .from("scheduled_posts")
        .update({ status: "failed", publish_error: message })
        .eq("id", post.id);
      throw new Error(message);
    }

    const firstUrl = results.find((r) => r.url)?.url ?? null;
    const { error: doneError } = await context.supabase
      .from("scheduled_posts")
      .update({ status: "published", published_url: firstUrl, publish_error: null })
      .eq("id", post.id);
    if (doneError) throw new Error(doneError.message);
    return { results };
  });

type CtxSupabase = SupabaseClient<Database>;

async function loadCredentials(
  supabase: CtxSupabase,
  platform: PlatformId,
): Promise<Record<string, string>> {
  // Saved connection first (encrypted), Telegram .env as a fallback.
  try {
    const { data } = await supabase
      .from("platform_connections")
      .select("credentials_ciphertext")
      .eq("platform", platform)
      .maybeSingle();
    if (data?.credentials_ciphertext) {
      const { decryptJson } = await import("@/lib/crypto.server");
      return decryptJson<Record<string, string>>(data.credentials_ciphertext);
    }
  } catch {
    // Fall through to env fallback / missing-credentials error below.
  }
  if (platform === "telegram") {
    const botToken = serverEnv("TELEGRAM_BOT_TOKEN");
    const chatId = serverEnv("TELEGRAM_CHAT_ID");
    if (botToken && chatId) return { bot_token: botToken, chat_id: chatId };
  }
  return {};
}

async function resolveMedia(
  supabase: CtxSupabase,
  mediaAssetId: string | null,
): Promise<{ url: string; kind: "video" | "image" | "audio" } | null> {
  if (!mediaAssetId) return null;
  const { data: asset } = await supabase
    .from("media_assets")
    .select("storage_path, kind")
    .eq("id", mediaAssetId)
    .maybeSingle();
  if (!asset) return null;
  if (asset.kind !== "video" && asset.kind !== "image" && asset.kind !== "audio") return null;
  const { data: signed } = await supabase.storage.from("media").createSignedUrl(asset.storage_path, 7 * 24 * 3600);
  if (!signed) return null;
  return { url: signed.signedUrl, kind: asset.kind };
}
