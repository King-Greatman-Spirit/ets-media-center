import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { serverEnv } from "./server-env"

// Picks the configured AI models, most capable first. Free tier first: a Google
// AI Studio key (GOOGLE_GENERATIVE_AI_API_KEY) costs nothing and needs no card.
// Falls back to OpenAI (paid) when only OPENAI_API_KEY is set. Returns an empty
// array when neither is configured so callers can show a setup message instead
// of crashing.
export function createAIModels() {
  const googleKey = serverEnv("GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY")
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey })
    return [
      // "flash-latest" alias tracks the current stable Flash model, so this
      // keeps working when Google retires numbered versions for new users.
      google("gemini-flash-latest"),
      // Google's recommended model for newly created keys.
      google("gemini-3.8-flash"),
      // Lite models usually have the most free-tier headroom.
      google("gemini-3.5-flash-lite"),
    ]
  }

  const openaiKey = serverEnv("OPENAI_API_KEY")
  if (openaiKey) {
    return [
      createOpenAI({
        apiKey: openaiKey,
        baseURL: "https://api.openai.com/v1",
      })("gpt-4o-mini"),
    ]
  }

  return []
}
