import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

const PLATFORM_IDS = PLATFORMS.map((p) => p.id) as [PlatformId, ...PlatformId[]];

const SaveInput = z.object({
  platform: z.enum(PLATFORM_IDS),
  label: z.string().max(120).nullable(),
  credentials: z.record(z.string(), z.string()),
});

/** Save (upsert) credentials for a platform, encrypted server-side. */
export const saveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const platform = PLATFORMS.find((p) => p.id === data.platform)!;
    const allowed = new Set(platform.fields.map((f) => f.key));
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.credentials)) {
      if (allowed.has(k) && v.trim()) cleaned[k] = v.trim();
    }
    const missing = platform.fields.filter((f) => !cleaned[f.key]);
    if (missing.length) {
      throw new Error(`Missing: ${missing.map((m) => m.label).join(", ")}`);
    }

    const { encryptJson } = await import("@/lib/crypto.server");
    const { error } = await context.supabase.from("platform_connections").upsert(
      {
        user_id: context.userId,
        platform: data.platform,
        label: data.label,
        credentials_ciphertext: encryptJson(cleaned),
        field_names: Object.keys(cleaned),
        status: "connected",
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Return masked previews (last 4 chars) so the UI can confirm what is stored. */
export const getConnectionPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ platform: z.enum(PLATFORM_IDS) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("platform_connections")
      .select("credentials_ciphertext")
      .eq("platform", data.platform)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { preview: null };
    const { decryptJson } = await import("@/lib/crypto.server");
    const creds = decryptJson<Record<string, string>>(row.credentials_ciphertext);
    const preview: Record<string, string> = {};
    for (const [k, v] of Object.entries(creds)) {
      preview[k] = v.length <= 6 ? "•".repeat(v.length) : `${"•".repeat(8)}${v.slice(-4)}`;
    }
    return { preview };
  });
