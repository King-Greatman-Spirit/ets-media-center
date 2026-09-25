import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EtsLogo } from "@/components/brand/Brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password | ETS Command Center" },
      { name: "description", content: "Choose a new password for your ETS account." },
      { property: "og:title", content: "Reset password | ETS" },
      { property: "og:description", content: "Choose a new password for your ETS account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <EtsLogo size={44} />
          <h1 className="font-display text-xl font-semibold">New password</h1>
        </div>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Open this page from the link in your reset email to set a new password.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gold-gradient text-primary-foreground">
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
