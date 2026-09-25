import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EtsCover, EtsLogo } from "@/components/brand/Brand";
import { Loader2, Shield, Sparkles, CalendarDays, Plug } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | ETS Command Center" },
      { name: "description", content: "Sign in to the End Time Soldiers media command center." },
      { property: "og:title", content: "Sign in | ETS Command Center" },
      { property: "og:description", content: "Raising a Kingdom Army for Such a Time as This." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Cover panel */}
      <div className="relative hidden lg:block grain bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_60%)]">
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <EtsLogo size={56} />
          <div className="max-w-lg space-y-6">
            <EtsCover overlay={false} className="rounded-xl border border-primary/20 shadow-[0_0_60px_-20px_var(--primary)]" />
            <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Media Command Center</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground">
              One studio. <span className="text-gold-gradient">Every platform.</span>
            </h1>
            <p className="text-base text-muted-foreground">

              Upload once, repurpose with AI, and schedule weeks ahead across YouTube, TikTok, Instagram,
              Facebook, Threads, LinkedIn, X, Telegram and Substack.
            </p>
            <ul className="grid grid-cols-2 gap-3 text-sm text-foreground/80">
              <Feature icon={Shield} label="Bulk media library" />
              <Feature icon={Sparkles} label="AI repurposing studio" />
              <Feature icon={CalendarDays} label="Visual content calendar" />
              <Feature icon={Plug} label="Platform connections" />
            </ul>
          </div>
          <p className="font-display text-[11px] tracking-[0.25em] text-muted-foreground">
            RAISING A KINGDOM ARMY FOR SUCH A TIME AS THIS
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <EtsLogo size={64} />
            <h1 className="mt-4 font-display text-2xl font-bold tracking-[0.2em] text-gold-gradient">ETS</h1>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Command Center</p>
          </div>

          <div className="panel p-8">
            <h2 className="font-display text-2xl font-semibold">
              {mode === "signin" && "Welcome back"}
              {mode === "signup" && "Join the studio"}
              {mode === "forgot" && "Reset password"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin" && "Sign in to your ETS command center."}
              {mode === "signup" && "Create your team account."}
              {mode === "forgot" && "We'll email you a reset link."}
            </p>

            {checkEmail ? (
              <div className="mt-6 rounded-lg border border-primary/30 bg-accent/40 p-4 text-sm">
                Confirmation sent to <strong>{email}</strong>. Click the link in that email, then sign in.
                <Button variant="link" className="px-0 text-primary" onClick={() => { setCheckEmail(false); setMode("signin"); }}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Commander Name" required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@endtimesoldiers.org" required autoComplete="email" />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                          Forgot?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                  </div>
                )}
                <Button type="submit" disabled={busy} className="w-full bg-gold-gradient font-semibold text-primary-foreground hover:opacity-90">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" && "Sign in"}
                  {mode === "signup" && "Create account"}
                  {mode === "forgot" && "Send reset link"}
                </Button>
              </form>
            )}

            {mode !== "forgot" && !checkEmail && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busy}>
                  <GoogleIcon /> Continue with Google
                </Button>
              </>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>No account? <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Create one</button></>
              ) : (
                <>Already enlisted? <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Sign in</button></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Shield; label: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2 backdrop-blur">
      <Icon className="h-4 w-4 text-primary" /> {label}
    </li>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.4-5.35 4.4-3.2 0-5.85-2.65-5.85-5.9S8.8 6.6 12 6.6c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 4.1 14.55 3.1 12 3.1 7.05 3.1 3.05 7.1 3.05 12.05S7.05 21 12 21c5.2 0 8.6-3.65 8.6-8.8 0-.6-.05-1.05-.25-1.1Z" />
    </svg>
  );
}
