import { aiProviderInstance } from "../ai/index.js";
import { createInsightService } from "./insight.service.js";

export { insightNestedRouter } from "./insight.routes.js";

export const insightServiceInstance = createInsightService(aiProviderInstance);
