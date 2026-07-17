import { aiProviderInstance } from "../ai/index.js";
import { createPlanService } from "./plan.service.js";

export { planNestedRouter } from "./plan.routes.js";

export const planServiceInstance = createPlanService(aiProviderInstance);
