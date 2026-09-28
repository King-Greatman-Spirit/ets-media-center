import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { serverEnv } from "./server-env"

// Picks the configured AI model. Free tier first: a Google AI Studio key
// (GOOGLE_GENERATIVE_AI_API_KEY) costs nothing and needs no card. Falls back
// to OpenAI (paid) when only OPENAI_API_KEY is set. Returns null when neither
// is configured so callers can show a setup message instead of crashing.
export function createAIModel() {
  const googleKey = serverEnv("GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY")
  if (googleKey) {
    return createGoogleGenerativeAI({ apiKey: googleKey })("gemini-2.0-flash")
  }

  const openaiKey = serverEnv("OPENAI_API_KEY")
  if (openaiKey) {
    return createOpenAI({
      apiKey: openaiKey,
      baseURL: "https://api.openai.com/v1",
    })("gpt-4o-mini")
  }

  return null
}
