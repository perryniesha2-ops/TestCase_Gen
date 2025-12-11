// types/templates.ts
// Type definitions for test case templates

export type TemplateCategory = 
  | 'functional' 
  | 'security' 
  | 'performance' 
  | 'integration' 
  | 'regression' 
  | 'accessibility' 
  | 'other'

export interface TemplateContent {
  // Core generation settings
  model: string
  testCaseCount: number
  coverage: 'standard' | 'comprehensive' | 'exhaustive'
  
  // Optional advanced settings
  defaultSections?: string[]
  customPrompt?: string
  includeEdgeCases?: boolean
  includeNegativeTests?: boolean
  priorityLevel?: 'high' | 'medium' | 'low'
  
  // Cross-platform specific
  platforms?: Array<{
    platform: string
    framework: string
  }>
  
  // Custom fields for extensibility
  customFields?: Record<string, any>
}

export interface Template {
  id: string
  user_id: string
  name: string
  description?: string | null
  category: TemplateCategory
  template_content: TemplateContent
  is_public: boolean
  is_favorite: boolean
  usage_count: number
  last_used_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateTemplateInput {
  name: string
  description?: string
  category: TemplateCategory
  template_content: TemplateContent
  is_public?: boolean
  is_favorite?: boolean
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export interface TemplateFormData {
  name: string
  description: string
  category: TemplateCategory
  model: string
  testCaseCount: number
  coverage: 'standard' | 'comprehensive' | 'exhaustive'
  includeEdgeCases: boolean
  includeNegativeTests: boolean
}

export interface TemplateStats {
  totalTemplates: number
  favoriteTemplates: number
  mostUsedTemplate?: Template
  recentTemplates: Template[]
}