import { createOpenAI } from "@ai-sdk/openai"

export function createAIGatewayProvider(
  apiKey: string,
  _options?: { structuredOutputs?: boolean },
) {
  return createOpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
  })
}
