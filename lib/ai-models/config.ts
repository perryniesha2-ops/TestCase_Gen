// lib/ai-models/config.ts
/**
 * AI Model Configuration
 * 
 * Single source of truth for all AI model versions across the application.
 * Update this file when new models are released.
 * 
 * Last Updated: December 2024
 * 
 * Check for updates:
 * - Anthropic: https://docs.anthropic.com/claude/docs/models-overview
 * - OpenAI: https://platform.openai.com/docs/models
 */

export const AI_MODELS = {
  // ============================================================================
  // ANTHROPIC CLAUDE MODELS
  // ============================================================================
  // Updated: December 2024
  
  // Claude 4.5 Family (Latest - December 2024)
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5-20250514",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    family: "claude-4.5",
    description: "Latest Sonnet - Best balance of speed & quality",
    hint: "Recommended",
    recommended: true,
    contextWindow: 200000,
    maxOutput: 8192,
    pricing: {
      input: 3.00,  // per 1M tokens
      output: 15.00 // per 1M tokens
    },
    releaseDate: "2024-12-01",
  },
  
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5-20250514",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    family: "claude-4.5",
    description: "Fastest Claude model - Great for simple tasks",
    hint: "Fast",
    recommended: false,
    contextWindow: 200000,
    maxOutput: 8192,
    pricing: {
      input: 0.80,
      output: 4.00
    },
    releaseDate: "2024-12-01",
  },
  
  "claude-opus-4-5": {
    id: "claude-opus-4-5-20250514",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    family: "claude-4.5",
    description: "Most capable Claude model - Best for complex test generation",
    hint: "Max quality",
    recommended: false,
    contextWindow: 200000,
    maxOutput: 8192,
    pricing: {
      input: 15.00,
      output: 75.00
    },
    releaseDate: "2024-12-01",
  },
  
  // ============================================================================
  // OPENAI GPT MODELS
  // ============================================================================
  // Updated: December 2024
  
  // GPT-5 Family (Latest)
  "gpt-5-mini": {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "openai",
    family: "gpt-5",
    description: "Balanced performance and cost",
    hint: "Balanced",
    recommended: false,
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: {
      input: 2.00,
      output: 8.00
    },
    releaseDate: "2024-12-01",
  },
  
  "gpt-5.2": {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    family: "gpt-5",
    description: "Premium GPT model - Latest capabilities",
    hint: "Premium",
    recommended: false,
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: {
      input: 5.00,
      output: 20.00
    },
    releaseDate: "2024-12-01",
  },
  
  // GPT-4o Family (Stable)
  "gpt-4o": {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o",
    provider: "openai",
    family: "gpt-4o",
    description: "Latest GPT-4o - Multimodal capabilities",
    hint: "",
    recommended: false,
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: {
      input: 2.50,
      output: 10.00
    },
    releaseDate: "2024-11-20",
  },
  
  "gpt-4o-mini": {
    id: "gpt-4o-mini-2024-07-18",
    name: "GPT-4o Mini",
    provider: "openai",
    family: "gpt-4o",
    description: "Cost-effective GPT-4o",
    hint: "",
    recommended: false,
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: {
      input: 0.15,
      output: 0.60
    },
    releaseDate: "2024-07-18",
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export type ModelKey = keyof typeof AI_MODELS;
export type AIModel = typeof AI_MODELS[ModelKey];

/**
 * Get model configuration by key
 */
export function getModel(key: ModelKey): AIModel {
  return AI_MODELS[key];
}

/**
 * Get model ID string for API calls
 */
export function getModelId(key: ModelKey): string {
  return AI_MODELS[key].id;
}

/**
 * Get all models from a specific provider
 */
export function getModelsByProvider(provider: "anthropic" | "openai"): AIModel[] {
  return Object.values(AI_MODELS).filter((model) => model.provider === provider);
}

/**
 * Get recommended models
 */
export function getRecommendedModels(): AIModel[] {
  return Object.values(AI_MODELS).filter((model) => model.recommended);
}

/**
 * Get models sorted by cost (cheapest first)
 */
export function getModelsByCost(): AIModel[] {
  return [...Object.values(AI_MODELS)].sort(
    (a, b) => a.pricing.input - b.pricing.input
  );
}

/**
 * Check if model is from Anthropic
 */
export function isAnthropicModel(key: ModelKey): boolean {
  return AI_MODELS[key].provider === "anthropic";
}

/**
 * Check if model is from OpenAI
 */
export function isOpenAIModel(key: ModelKey): boolean {
  return AI_MODELS[key].provider === "openai";
}

/**
 * Get fallback model for a given provider
 */
export function getFallbackModel(provider: "anthropic" | "openai"): ModelKey {
  if (provider === "anthropic") {
    return "claude-sonnet-4-5"; // Latest Sonnet fallback
  }
  return "gpt-4o"; // Latest GPT fallback
}

/**
 * Get default model (best balance of cost/performance)
 */
export function getDefaultModel(): ModelKey {
  return "claude-sonnet-4-5";
}

// ============================================================================
// MODEL GROUPING FOR UI
// ============================================================================

export const MODEL_GROUPS = {
  recommended: {
    label: "Recommended",
    models: ["claude-sonnet-4-5", "gpt-5-mini"] as ModelKey[],
  },
  anthropic: {
    label: "Anthropic Claude",
    models: [
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
      "claude-opus-4-5",
    ] as ModelKey[],
  },
  openai: {
    label: "OpenAI GPT",
    models: [
      "gpt-5.2",
      "gpt-5-mini",
      "gpt-4o",
      "gpt-4o-mini",
    ] as ModelKey[],
  },
  costEffective: {
    label: "Cost Effective",
    models: ["claude-haiku-4-5", "gpt-4o-mini"] as ModelKey[],
  },
} as const;

// ============================================================================
// VERSION CHECKER
// ============================================================================

/**
 * Log current model versions to console
 * Useful for debugging and verifying updates
 */
export function logModelVersions(): void {
 
  getModelsByProvider("anthropic").forEach((model) => {
  });
  
  getModelsByProvider("openai").forEach((model) => {
  });
  
  getRecommendedModels().forEach((model) => {
  });
  
  const cheapest = getModelsByCost()[0];
}

// ============================================================================
// MIGRATION HELPER
// ============================================================================

/**
 * Maps old model keys to new ones for backwards compatibility
 */
export const MODEL_MIGRATIONS: Record<string, ModelKey> = {
  // Old Anthropic keys (Claude 3.5 → Claude 4.5)
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
  "claude-3-5-sonnet": "claude-sonnet-4-5",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5",
  "claude-3-5-haiku": "claude-haiku-4-5",
  
  // Old Claude 4 keys (Claude 4 → Claude 4.5)
  "claude-sonnet-4": "claude-sonnet-4-5",
  "claude-opus-4": "claude-opus-4-5",
  "claude-haiku-4": "claude-haiku-4-5",
  
  // Old OpenAI keys
  "gpt-4o-2024-11-20": "gpt-4o",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini",
  "gpt-4-turbo-2024-04-09": "gpt-4o",
  "gpt-4-turbo": "gpt-4o",
  "gpt-3-5-turbo": "gpt-4o-mini",
};

/**
 * Migrate old model key to new one
 */
export function migrateModelKey(oldKey: string): ModelKey {
  return MODEL_MIGRATIONS[oldKey] || (oldKey as ModelKey);
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  AI_MODELS,
  getModel,
  getModelId,
  getModelsByProvider,
  getRecommendedModels,
  getModelsByCost,
  isAnthropicModel,
  isOpenAIModel,
  getFallbackModel,
  getDefaultModel,
  MODEL_GROUPS,
  logModelVersions,
  migrateModelKey,
};