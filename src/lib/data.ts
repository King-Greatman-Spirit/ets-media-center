import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];
export type ScheduledPost = Database["public"]["Tables"]["scheduled_posts"]["Row"];
export type PlatformConnection = Database["public"]["Tables"]["platform_connections"]["Row"];
export type RepurposeSession = Database["public"]["Tables"]["repurpose_sessions"]["Row"];
export type MediaKind = Database["public"]["Enums"]["media_kind"];
export type PostStatus = Database["public"]["Enums"]["post_status"];

export const mediaQuery = queryOptions({
  queryKey: ["media"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const postsQuery = queryOptions({
  queryKey: ["posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("scheduled_posts")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const connectionsQuery = queryOptions({
  queryKey: ["connections"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("platform_connections")
      .select("id, platform, label, field_names, status, last_checked_at, created_at, updated_at, user_id");
    if (error) throw error;
    return data;
  },
});

export const sessionsQuery = queryOptions({
  queryKey: ["sessions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("repurpose_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  },
});

export function kindFromMime(mime: string): MediaKind | null {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

export async function signedUrl(path: string, expires = 3600) {
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, expires);
  if (error) throw error;
  return data.signedUrl;
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUpsertPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      post: Omit<Database["public"]["Tables"]["scheduled_posts"]["Insert"], "user_id"> & { id?: string },
    ) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("scheduled_posts")
        .upsert({ ...post, user_id: auth.user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}
