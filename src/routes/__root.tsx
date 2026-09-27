import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import "@/styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ETS Command Center | End Time Soldiers" },
      {
        name: "description",
        content: "End Time Soldiers media command center — upload, repurpose with AI, and schedule across every platform.",
      },
    ],
    links: [{ rel: "icon", href: "/favicon.png", type: "image/png" }],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">404 — Not Found</h1>
        <p className="text-muted-foreground">This page does not exist.</p>
      </div>
    </div>
  ),
});

function RootComponent() {
  return (
    <RootDocument>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
