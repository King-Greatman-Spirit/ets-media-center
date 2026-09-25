import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EtsLogo } from "@/components/brand/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ETS Command Center | End Time Soldiers" },
      {
        name: "description",
        content: "Sign in to the ETS media command center — upload, repurpose with AI, and schedule across every platform.",
      },
      { property: "og:title", content: "ETS Command Center" },
      { property: "og:description", content: "Raising a Kingdom Army for Such a Time as This." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <EtsLogo size={72} />
        <span className="font-display text-xs tracking-[0.3em] text-muted-foreground">LOADING ETS</span>
      </div>
    </div>
  );
}
