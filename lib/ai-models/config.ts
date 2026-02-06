// lib/ai-models/config.ts

export const AI_MODELS = {
  // ============================================================================
  // ANTHROPIC CLAUDE MODELS
  // ============================================================================
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
    pricing: { input: 3.0, output: 15.0 },
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
    pricing: { input: 0.8, output: 4.0 },
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
    pricing: { input: 15.0, output: 75.0 },
    releaseDate: "2024-12-01",
  },

  // ============================================================================
  // OPENAI GPT MODELS (SAFE ALLOWLIST)
  // ============================================================================
  // NOTE: GPT-5 family intentionally excluded for reliability in production.
  "gpt-4o": {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o",
    provider: "openai",
    family: "gpt-4o",
    description: "Stable GPT-4o - Multimodal capabilities",
    hint: "",
    recommended: false,
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: { input: 2.5, output: 10.0 },
    releaseDate: "2024-11-20",
  },

  "gpt-4o-mini": {
    id: "gpt-4o-mini-2024-07-18",
    name: "GPT-4o Mini",
    provider: "openai",
    family: "gpt-4o",
    description: "Cost-effective stable GPT-4o",
    hint: "",
    recommended: false,
    contextWindow: 128000,
    maxOutput: 16384,
    pricing: { input: 0.15, output: 0.6 },
    releaseDate: "2024-07-18",
  },
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================
export type ModelKey = keyof typeof AI_MODELS;
export type AIModel = (typeof AI_MODELS)[ModelKey];

// ============================================================================
// HELPERS
// ============================================================================
export function getModel(key: ModelKey): AIModel {
  return AI_MODELS[key];
}

export function getModelId(key: ModelKey): string {
  return AI_MODELS[key].id;
}

export function getModelsByProvider(
  provider: "anthropic" | "openai",
): AIModel[] {
  return Object.values(AI_MODELS).filter((m) => m.provider === provider);
}

export function getRecommendedModels(): AIModel[] {
  return Object.values(AI_MODELS).filter((m) => m.recommended);
}

export function getModelsByCost(): AIModel[] {
  return [...Object.values(AI_MODELS)].sort(
    (a, b) => a.pricing.input - b.pricing.input,
  );
}

export function isAnthropicModel(key: ModelKey): boolean {
  return AI_MODELS[key].provider === "anthropic";
}

export function isOpenAIModel(key: ModelKey): boolean {
  return AI_MODELS[key].provider === "openai";
}

export function getFallbackModel(provider: "anthropic" | "openai"): ModelKey {
  return provider === "anthropic" ? "claude-sonnet-4-5" : "gpt-4o";
}

export function getDefaultModel(): ModelKey {
  return "claude-sonnet-4-5";
}

/**
 * Defensive: check that a key exists in our allowlist.
 * Useful for API validation when client sends stale/cached keys.
 */
export function isModelAllowed(key: string): key is ModelKey {
  return key in AI_MODELS;
}

// ============================================================================
// MODEL GROUPING FOR UI
// ============================================================================
export const MODEL_GROUPS = {
  recommended: {
    label: "Recommended",
    models: ["claude-sonnet-4-5"] as ModelKey[],
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
    models: ["gpt-4o", "gpt-4o-mini"] as ModelKey[],
  },
  costEffective: {
    label: "Cost Effective",
    models: ["claude-haiku-4-5", "gpt-4o-mini"] as ModelKey[],
  },
} as const;

// ============================================================================
// MIGRATION HELPER
// ============================================================================
export const MODEL_MIGRATIONS: Record<string, ModelKey> = {
  // Old Anthropic keys
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
  "claude-3-5-sonnet": "claude-sonnet-4-5",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5",
  "claude-3-5-haiku": "claude-haiku-4-5",

  // Old Claude 4 keys
  "claude-sonnet-4": "claude-sonnet-4-5",
  "claude-opus-4": "claude-opus-4-5",
  "claude-haiku-4": "claude-haiku-4-5",

  // Old OpenAI IDs -> keys
  "gpt-4o-2024-11-20": "gpt-4o",
  "gpt-4o-mini-2024-07-18": "gpt-4o-mini",
  "gpt-4-turbo-2024-04-09": "gpt-4o",
  "gpt-4-turbo": "gpt-4o",
  "gpt-3-5-turbo": "gpt-4o-mini",

  // GPT-5 keys (deprecated/disabled) -> safe fallbacks
  "gpt-5-mini": "gpt-4o-mini",
  "gpt-5.2": "gpt-4o",
};

export function migrateModelKey(oldKey: string): ModelKey {
  const migrated = MODEL_MIGRATIONS[oldKey] ?? oldKey;
  // If a stale key slips through, force fallback
  return migrated in AI_MODELS ? (migrated as ModelKey) : getDefaultModel();
}

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
  isModelAllowed,
  MODEL_GROUPS,
  migrateModelKey,
};
