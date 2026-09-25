import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExternalLink, ShieldCheck, Loader2, Trash2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { connectionsQuery } from "@/lib/data";
import { PLATFORMS, type Platform } from "@/lib/platforms";
import { saveConnection } from "@/lib/connections.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({
    meta: [
      { title: "Platform Connections | ETS Command Center" },
      { name: "description", content: "Securely store API keys and credentials for every ETS publishing channel." },
      { property: "og:title", content: "Platform Connections | ETS" },
      { property: "og:description", content: "Securely store API keys for every ETS publishing channel." },
    ],
  }),
  component: Connections,
});

function Connections() {
  const qc = useQueryClient();
  const connections = useQuery(connectionsQuery);
  const [active, setActive] = useState<Platform | null>(null);

  const byPlatform = new Map((connections.data ?? []).map((c) => [c.platform, c]));

  async function disconnect(platform: string) {
    const { error } = await supabase.from("platform_connections").delete().eq("platform", platform);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Disconnected.");
    qc.invalidateQueries({ queryKey: ["connections"] });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Platform Connections"
        description="Store the API keys for each channel. Credentials are encrypted before they are saved and are never shown again in full."
      />

      <div className="panel mb-6 flex items-start gap-3 border-primary/30 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Keys are encrypted on the server before storage and only your account can read them. Automatic publishing to
          these channels is the next phase — for now connections power status and readiness checks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map((p) => {
          const conn = byPlatform.get(p.id);
          return (
            <div key={p.id} className="panel flex flex-col p-5 transition hover:gold-ring">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-background" style={{ backgroundColor: p.color }}>
                  {p.short}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.fields.length} credentials required</p>
                </div>
                {conn ? (
                  <Badge className="bg-success/15 text-success hover:bg-success/15">Connected</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Not linked</Badge>
                )}
              </div>

              <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">{p.format}</p>

              {conn?.last_checked_at && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Saved {format(new Date(conn.last_checked_at), "d MMM yyyy, h:mm a")}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant={conn ? "outline" : "default"} className={conn ? "" : "bg-gold-gradient text-primary-foreground"} onClick={() => setActive(p)}>
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {conn ? "Update keys" : "Connect"}
                </Button>
                <a href={p.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                  <ExternalLink className="inline h-3 w-3" /> Get keys
                </a>
                {conn && (
                  <Button size="icon" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => disconnect(p.id)} aria-label="Disconnect">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CredentialDialog platform={active} onClose={() => setActive(null)} />
    </div>
  );
}

function CredentialDialog({ platform, onClose }: { platform: Platform | null; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveConnection);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!platform) return;
    setBusy(true);
    try {
      await save({ data: { platform: platform.id, label: null, credentials: values } });
      toast.success(`${platform.name} connected.`);
      await qc.invalidateQueries({ queryKey: ["connections"] });
      setValues({});
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save credentials");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!platform} onOpenChange={(o) => { if (!o) { setValues({}); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Connect {platform?.name}</DialogTitle>
          <DialogDescription>
            Paste your credentials below. They are encrypted before being stored and never displayed again.
          </DialogDescription>
        </DialogHeader>
        {platform && (
          <form onSubmit={submit} className="space-y-4">
            {platform.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.secret ? "password" : "text"}
                  autoComplete="off"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  required
                />
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={busy} className="bg-gold-gradient text-primary-foreground">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save securely
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
