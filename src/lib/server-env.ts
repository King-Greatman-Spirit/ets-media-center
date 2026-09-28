// Reads env vars in server code (server functions, middleware, .server modules).
//
// Why this exists: server functions must work in two worlds.
// - Production: real environment variables on `process.env`.
// - Dev (Vite/TanStack Start server runtime): values from `.env`, which are
//   visible through `import.meta.env` but not always on `process.env`.
//   (Only VITE_* names are inlined into the client bundle, but the server
//   runtime sees the full file.)
//
// Client-safe: `process` is only touched behind a typeof guard and the only
// other source is `import.meta.env`, so importing this from *.functions.ts
// files (which also ship a client stub) leaks nothing.
const metaEnv: Record<string, string | boolean | undefined> =
  (import.meta as unknown as { env?: Record<string, string | boolean | undefined> })
    .env ?? {};

export function serverEnv(...names: string[]): string | undefined {
  for (const name of names) {
    if (typeof process !== "undefined") {
      const fromProcess = process.env[name];
      if (fromProcess) return fromProcess;
    }
    const fromMeta = metaEnv[name];
    if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  }
  return undefined;
}
