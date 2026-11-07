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
      // Lite models first: they answer in 2-5s even when the big Flash models
      // are overloaded. Verified live for both vision (moment detection) and
      // text (captions). The full-size models hang for 60s+ or 503 right now,
      // which is why detection appeared to freeze: each segment burned a
      // minute per dead model before failing over.
      google("gemini-3.5-flash-lite"),
      google("gemini-flash-lite-latest"),
      google("gemini-3.1-flash-lite"),
      // Full-size fallbacks, only reached if every Lite model fails.
      google("gemini-3.6-flash"),
      google("gemini-3.5-flash"),
      google("gemini-3.7-flash"),
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
