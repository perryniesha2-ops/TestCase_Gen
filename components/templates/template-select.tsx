"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FileText, Star, Sparkles, Shield, Zap, Globe, GitBranch, Eye, X } from "lucide-react"

type TemplateCategory = 'functional' | 'security' | 'performance' | 'integration' | 'regression' | 'accessibility' | 'other'

interface TemplateContent {
  model: string
  testCaseCount: number
  coverage: 'standard' | 'comprehensive' | 'exhaustive'
  includeEdgeCases?: boolean
  includeNegativeTests?: boolean
}

interface Template {
  id: string
  name: string
  description?: string | null
  category: TemplateCategory
  template_content: TemplateContent
  is_favorite: boolean
  usage_count: number
}

interface TemplateSelectProps {
  value?: string
  onSelect: (template: Template | null) => void
  disabled?: boolean
}

const categoryIcons: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  functional: Sparkles,
  security: Shield,
  performance: Zap,
  integration: Globe,
  regression: GitBranch,
  accessibility: Eye,
  other: FileText,
}

/**
 * Get display name for AI model
 * Handles both old and new model naming conventions
 */
function getModelDisplayName(modelKey: string): string {
  // Latest models (Dec 2024)
  if (modelKey === "claude-sonnet-4-5") return "Claude Sonnet 4.5"
  if (modelKey === "claude-haiku-4-5") return "Claude Haiku 4.5"
  if (modelKey === "claude-opus-4-5") return "Claude Opus 4.5"
  if (modelKey === "gpt-5-mini") return "GPT-5 Mini"
  if (modelKey === "gpt-5.2") return "GPT-5.2"
  if (modelKey === "gpt-4o") return "GPT-4o"
  if (modelKey === "gpt-4o-mini") return "GPT-4o Mini"
  
  // Legacy models (backwards compatibility)
  if (modelKey.includes("claude-3-5-sonnet")) return "Claude 3.5 Sonnet"
  if (modelKey.includes("claude-3-5-haiku")) return "Claude 3.5 Haiku"
  if (modelKey.includes("claude-sonnet-4")) return "Claude Sonnet 4"
  if (modelKey.includes("claude-opus-4")) return "Claude Opus 4"
  if (modelKey.includes("gpt-4-turbo")) return "GPT-4 Turbo"
  if (modelKey.includes("gpt-3.5")) return "GPT-3.5 Turbo"
  
  // Fallback - extract readable name
  if (modelKey.includes("claude")) return "Claude"
  if (modelKey.includes("gpt")) return "GPT"
  
  return modelKey
}

export function TemplateSelect({ value, onSelect, disabled }: TemplateSelectProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (value) {
      const template = templates.find(t => t.id === value)
      setSelectedTemplate(template || null)
    } else {
      setSelectedTemplate(null)
    }
  }, [value, templates])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("test_case_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("usage_count", { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }

   function handleChange(id: string) {
    if (!id || id === "__none") {
      onSelect(null)
      return
    }
    const selected = templates.find((t) => t.id === id) ?? null
    onSelect(selected)
  }

  async function handleTemplateSelect(templateId: string) {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // Increment usage count
    try {
      const supabase = createClient()
      await supabase
        .from("test_case_templates")
        .update({
          usage_count: template.usage_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", templateId)

      // Update local state
      setTemplates(prev =>
        prev.map(t =>
          t.id === templateId
            ? { ...t, usage_count: t.usage_count + 1 }
            : t
        )
      )
    } catch (error) {
      console.error("Error updating template usage:", error)
    }

    setSelectedTemplate(template)
    onSelect(template)
    toast.success(`Template "${template.name}" applied`)
  }

  function clearTemplate() {
    setSelectedTemplate(null)
    onSelect(null)
  }

  const favoriteTemplates = templates.filter(t => t.is_favorite)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Use Template (Optional)</Label>
        {selectedTemplate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearTemplate}
            disabled={disabled}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {selectedTemplate ? (
        <Card className="border-2 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = categoryIcons[selectedTemplate.category]
                  return <Icon className="h-4 w-4 text-primary" />
                })()}
                <CardTitle className="text-base">{selectedTemplate.name}</CardTitle>
                {selectedTemplate.is_favorite && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
              </div>
            </div>
            {selectedTemplate.description && (
              <CardDescription className="text-xs">
                {selectedTemplate.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tests:</span>
                <span className="font-medium">
                  {selectedTemplate.template_content.testCaseCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coverage:</span>
                <span className="font-medium capitalize">
                  {selectedTemplate.template_content.coverage}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">
                  {getModelDisplayName(selectedTemplate.template_content.model)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <Badge variant="outline" className="text-xs h-5">
                  {selectedTemplate.category}
                </Badge>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={() => setShowDetailsDialog(true)}
            >
              View Details
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Select
            value={value}
            onValueChange={handleTemplateSelect}
            disabled={disabled || loading}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder={loading ? "Loading templates..." : "Select a template"} />
            </SelectTrigger>
            <SelectContent>
              {favoriteTemplates.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    ⭐ Favorites
                  </div>
                  {favoriteTemplates.map(template => {
                    const Icon = categoryIcons[template.category]
                    return (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{template.name}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {template.usage_count}
                          </Badge>
                        </div>
                      </SelectItem>
                    )
                  })}
                </>
              )}

              {templates.filter(t => !t.is_favorite).length > 0 && (
                <>
                  {favoriteTemplates.length > 0 && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                      All Templates
                    </div>
                  )}
                  {templates
                    .filter(t => !t.is_favorite)
                    .map(template => {
                      const Icon = categoryIcons[template.category]
                      return (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                </>
              )}

              {templates.length === 0 && !loading && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No templates yet. Create one to get started!
                </div>
              )}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            Select a template to auto-fill settings, or leave empty to configure manually
          </p>
        </>
      )}

      {/* Template Details Dialog */}
      {selectedTemplate && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = categoryIcons[selectedTemplate.category]
                  return <Icon className="h-5 w-5" />
                })()}
                {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.description || "No description provided"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge>{selectedTemplate.category}</Badge>
                {selectedTemplate.is_favorite && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    Favorite
                  </Badge>
                )}
                <Badge variant="outline">Used {selectedTemplate.usage_count} times</Badge>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Template Settings</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">AI Model:</span>
                    <span className="font-medium">
                      {getModelDisplayName(selectedTemplate.template_content.model)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Test Cases:</span>
                    <span className="font-medium">
                      {selectedTemplate.template_content.testCaseCount}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Coverage Level:</span>
                    <span className="font-medium capitalize">
                      {selectedTemplate.template_content.coverage}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Edge Cases:</span>
                    <span className="font-medium">
                      {selectedTemplate.template_content.includeEdgeCases ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Negative Tests:</span>
                    <span className="font-medium">
                      {selectedTemplate.template_content.includeNegativeTests ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}