import { OpenAI } from "@ai-sdk/openai";

export function createAIGatewayProvider(
  apiKey: string,
  options?: { structuredOutputs?: boolean },
) {
  const provider = new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
  });
  return provider;
}
