// types/templates.ts

export type TemplateCategory =
  | "functional"
  | "security"
  | "performance"
  | "integration"
  | "regression"
  | "accessibility"
  | "other";

export type Coverage = "standard" | "comprehensive" | "exhaustive";

export interface TemplateContent {
  model: string;
  testCaseCount: number;
  includeEdgeCases?: boolean;
  includeNegativeTests?: boolean;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  category: TemplateCategory;
  template_content: TemplateContent;
  is_public: boolean;
  is_favorite: boolean;
  usage_count: number;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  template_content: TemplateContent;
  is_public?: boolean;
  is_favorite?: boolean;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

export interface TemplateFormData {
  name: string;
  description: string;
  category: TemplateCategory;
  model: string;
  testCaseCount: number;
  includeEdgeCases: boolean;
  includeNegativeTests: boolean;
  test_types: CanonicalTestType[];
  project_id: string | null;
}

export interface TemplateStats {
  totalTemplates: number;
  favoriteTemplates: number;
  mostUsedTemplate?: Template;
  recentTemplates: Template[];
}
export type CanonicalTestType =
  | "happy-path"
  | "negative"
  | "security"
  | "boundary"
  | "edge-case"
  | "performance"
  | "integration"
  | "regression"
  | "smoke";
