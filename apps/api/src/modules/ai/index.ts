import { env } from "../../env.js";
import { ServiceUnavailableError } from "../../lib/http-errors.js";
import { logger } from "../../lib/logger.js";
import { GeminiProvider, type AiProvider } from "./ai.provider.js";
import { createAiService } from "./ai.service.js";

export { aiNestedRouter, aiRouter } from "./ai.routes.js";
export { actionExecutorService } from "./action-executor.service.js";

/**
 * Singleton AI service.
 *
 * Provider selection: GEMINI_API_KEY → GeminiProvider.
 *
 * Server can boot without AI credentials.
 * AI routes will return 503 until configured.
 */
function resolveProvider(): AiProvider {
  if (env.GEMINI_API_KEY) {
    return new GeminiProvider(env.GEMINI_API_KEY);
  }

  logger.warn(
    "GEMINI_API_KEY is not set — AI routes will return 503 until configured",
  );

  const unavailable = () =>
    new ServiceUnavailableError(
      "No AI provider configured. Set GEMINI_API_KEY in your environment.",
    );

  return {
    async *streamChat() {
      throw unavailable();
      yield "";
    },

    async suggestTasks() {
      throw unavailable();
    },

    async *streamBreakdown() {
      throw unavailable();
      yield "";
    },
  };
}

export const aiProviderInstance: AiProvider = resolveProvider();

export const aiServiceInstance =
  createAiService(aiProviderInstance);
