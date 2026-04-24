import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { OPENROUTER_API_KEY } from "$env/static/private";
export const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
});
// Choose your preferred model
export const defaultModel = "stepfun/step-3.5-flash";
