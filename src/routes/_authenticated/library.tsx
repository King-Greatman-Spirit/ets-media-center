import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { UploadCloud, Film, Image as ImageIcon, Music, Trash2, Search, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { mediaQuery, kindFromMime, formatBytes, signedUrl, type MediaAsset } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Media Library | ETS Command Center" },
      { name: "description", content: "Bulk upload and organise reels, images and audio for the ETS media studio." },
      { property: "og:title", content: "Media Library | ETS" },
      { property: "og:description", content: "Bulk upload and organise reels, images and audio." },
    ],
  }),
  component: Library,
});

type Upload = { name: string; progress: number; error?: string };

const KIND_ICON = { video: Film, image: ImageIcon, audio: Music } as const;

function Library() {
  const qc = useQueryClient();
  const media = useQuery(mediaQuery);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filter, setFilter] = useState<"all" | "video" | "image" | "audio">("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ asset: MediaAsset; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Please sign in again.");
        return;
      }

      setUploads(list.map((f) => ({ name: f.name, progress: 0 })));
      let ok = 0;

      for (const [i, file] of list.entries()) {
        const kind = kindFromMime(file.type);
        if (!kind) {
          setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: "Unsupported file type" } : x)));
          continue;
        }
        const path = `${auth.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 35 } : x)));

        const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) {
          setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: upErr.message } : x)));
          continue;
        }
        setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 80 } : x)));

        const { error: dbErr } = await supabase.from("media_assets").insert({
          user_id: auth.user.id,
          name: file.name,
          kind,
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
        });
        if (dbErr) {
          setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: dbErr.message } : x)));
          continue;
        }
        ok++;
        setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 100 } : x)));
      }

      await qc.invalidateQueries({ queryKey: ["media"] });
      if (ok) toast.success(`${ok} file${ok === 1 ? "" : "s"} added to the library.`);
      setTimeout(() => setUploads([]), 2500);
    },
    [qc],
  );

  async function remove(asset: MediaAsset) {
    await supabase.storage.from("media").remove([asset.storage_path]);
    const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed from library.");
    qc.invalidateQueries({ queryKey: ["media"] });
  }

  async function open(asset: MediaAsset) {
    try {
      setPreview({ asset, url: await signedUrl(asset.storage_path) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open file");
    }
  }

  const items = (media.data ?? []).filter(
    (m) => (filter === "all" || m.kind === filter) && m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Assets"
        title="Media Library"
        description="Drop in reels, images and audio in bulk. Everything here feeds the AI studio and your calendar."
        actions={
          <Button onClick={() => inputRef.current?.click()} className="bg-gold-gradient text-primary-foreground hover:opacity-90">
            <UploadCloud className="mr-2 h-4 w-4" /> Upload files
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "panel grain flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-14 text-center transition-all",
          dragging ? "border-primary bg-accent/40 gold-ring" : "border-border hover:border-primary/50",
        )}
      >
        <UploadCloud className={cn("h-10 w-10 transition-transform", dragging ? "scale-110 text-primary" : "text-muted-foreground")} />
        <p className="font-display text-lg font-semibold">Drop your media here</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Short-form video (MP4, MOV), images (JPG, PNG, WEBP) and audio (MP3, WAV). Select as many as you like.
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="panel mt-4 space-y-3 p-4">
          {uploads.map((u) => (
            <div key={u.name} className="flex items-center gap-3">
              <span className="w-56 truncate text-sm">{u.name}</span>
              {u.error ? (
                <span className="text-xs text-destructive">{u.error}</span>
              ) : (
                <>
                  <Progress value={u.progress} className="h-1.5 flex-1" />
                  <span className="w-10 text-right text-xs text-muted-foreground">{u.progress}%</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "video", "image", "audio"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition",
                filter === f ? "border-primary/50 bg-accent text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets" className="pl-9" />
        </div>
      </div>

      <div className="mt-5">
        {media.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nothing here yet. Drop files above to build your library.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => {
              const Icon = KIND_ICON[m.kind];
              return (
                <div key={m.id} className="panel group overflow-hidden transition hover:gold-ring">
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-accent/40 to-card">
                    <Icon className="h-10 w-10 text-primary/70" />
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-semibold" title={m.name}>{m.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="border-primary/30 text-primary capitalize">{m.kind}</Badge>
                      {formatBytes(Number(m.size_bytes))} · {format(new Date(m.created_at), "d MMM")}
                    </div>
                    <div className="mt-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => open(m)}>
                        <Eye className="mr-1 h-3 w-3" /> Preview
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(m)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="font-display">{preview?.asset.name}</DialogTitle></DialogHeader>
          {preview && preview.asset.kind === "video" && <video src={preview.url} controls className="max-h-[70vh] w-full rounded-lg" />}
          {preview && preview.asset.kind === "image" && <img src={preview.url} alt={preview.asset.name} className="max-h-[70vh] w-full rounded-lg object-contain" />}
          {preview && preview.asset.kind === "audio" && <audio src={preview.url} controls className="w-full" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
