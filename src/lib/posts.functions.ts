import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Deletes go through a server function (not the browser Supabase client):
// the JWT travels in the request header, the exact path that already works
// in this app for inserts (cut/brand jobs queue drafts successfully).

const DeleteInput = z.object({ postId: z.string().uuid() });
const DeleteBatchInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error("Nothing was deleted. The post may already be gone, or you don't have permission to remove it.");
    }
    return { ok: true as const };
  });

export const deletePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteBatchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("scheduled_posts")
      .delete()
      .in("id", data.ids)
      .eq("user_id", context.userId)
      .select("id");
    if (error) throw new Error(error.message);
    return { deleted: rows?.length ?? 0, requested: data.ids.length };
  });
