"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Copy,
  Star,
  MoreVertical,
  TrendingUp,
  Clock,
  Filter,
  Search,
  Sparkles,
  Shield,
  Zap,
  Globe,
  GitBranch,
  Eye,
  Loader2,
} from "lucide-react"

// Types
type TemplateCategory = 'functional' | 'security' | 'performance' | 'integration' | 'regression' | 'accessibility' | 'other'

interface TemplateContent {
  model: string
  testCaseCount: number
  coverage: 'standard' | 'comprehensive' | 'exhaustive'
  includeEdgeCases?: boolean
  includeNegativeTests?: boolean
  defaultSections?: string[]
}

interface Template {
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

interface TemplateFormData {
  name: string
  description: string
  category: TemplateCategory
  model: string
  testCaseCount: number
  coverage: 'standard' | 'comprehensive' | 'exhaustive'
  includeEdgeCases: boolean
  includeNegativeTests: boolean
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

const categoryColors: Record<TemplateCategory, string> = {
  functional: 'bg-blue-500',
  security: 'bg-red-500',
  performance: 'bg-orange-500',
  integration: 'bg-purple-500',
  regression: 'bg-green-500',
  accessibility: 'bg-indigo-500',
  other: 'bg-gray-500',
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">("all")
  const [activeTab, setActiveTab] = useState<"my-templates" | "public">("my-templates")

  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    category: "functional",
    model: "claude-3-5-sonnet-20241022",
    testCaseCount: 10,
    coverage: "comprehensive",
    includeEdgeCases: true,
    includeNegativeTests: true,
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, categoryFilter, activeTab])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please sign in to view templates")
        return
      }

      const { data, error } = await supabase
        .from("test_case_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  function filterTemplates() {
    let filtered = templates

    // Filter by tab (my templates vs public)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        filtered = activeTab === "my-templates"
          ? filtered.filter(t => t.user_id === user.id)
          : filtered.filter(t => t.is_public && t.user_id !== user.id)
      }

      // Filter by category
      if (categoryFilter !== "all") {
        filtered = filtered.filter(t => t.category === categoryFilter)
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
        )
      }

      setFilteredTemplates(filtered)
    }).catch(err => {
      console.error('Error filtering templates:', err)
    })
  }

  async function saveTemplate() {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please sign in to save templates")
        return
      }

      const templateContent: TemplateContent = {
        model: formData.model,
        testCaseCount: formData.testCaseCount,
        coverage: formData.coverage,
        includeEdgeCases: formData.includeEdgeCases,
        includeNegativeTests: formData.includeNegativeTests,
      }

      const templateData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        template_content: templateContent,
        is_public: false,
        is_favorite: false,
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from("test_case_templates")
          .update(templateData)
          .eq("id", editingTemplate.id)

        if (error) throw error
        toast.success("Template updated successfully")
      } else {
        const { error } = await supabase
          .from("test_case_templates")
          .insert(templateData)

        if (error) throw error
        toast.success("Template created successfully")
      }

      setShowDialog(false)
      setEditingTemplate(null)
      resetForm()
      await fetchTemplates()
    } catch (error) {
      console.error("Error saving template:", error)
      toast.error("Failed to save template")
    } finally {
      setLoading(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? This action cannot be undone.")) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("test_case_templates")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Template deleted")
      await fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    }
  }

  async function duplicateTemplate(template: Template) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Please sign in to duplicate templates")
        return
      }

      const { error } = await supabase
        .from("test_case_templates")
        .insert({
          user_id: user.id,
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          template_content: template.template_content,
          is_public: false,
          is_favorite: false,
        })

      if (error) throw error
      toast.success("Template duplicated")
      await fetchTemplates()
    } catch (error) {
      console.error("Error duplicating template:", error)
      toast.error("Failed to duplicate template")
    }
  }

  async function toggleFavorite(template: Template) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("test_case_templates")
        .update({ is_favorite: !template.is_favorite })
        .eq("id", template.id)

      if (error) throw error
      await fetchTemplates()
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast.error("Failed to update favorite status")
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      category: "functional",
      model: "claude-3-5-sonnet-20241022",
      testCaseCount: 10,
      coverage: "comprehensive",
      includeEdgeCases: true,
      includeNegativeTests: true,
    })
  }

  function openEditDialog(template: Template) {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      model: template.template_content.model,
      testCaseCount: template.template_content.testCaseCount,
      coverage: template.template_content.coverage,
      includeEdgeCases: template.template_content.includeEdgeCases ?? true,
      includeNegativeTests: template.template_content.includeNegativeTests ?? true,
    })
    setShowDialog(true)
  }

  function openNewDialog() {
    setEditingTemplate(null)
    resetForm()
    setShowDialog(true)
  }

  const favoriteTemplates = filteredTemplates.filter(t => t.is_favorite)
  const mostUsedTemplate = [...templates].sort((a, b) => b.usage_count - a.usage_count)[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          
        </div>
        <Button onClick={openNewDialog} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {favoriteTemplates.length} favorites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mostUsedTemplate?.usage_count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {mostUsedTemplate?.name || "No templates used yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter(t => {
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return new Date(t.created_at) > weekAgo
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Created this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as TemplateCategory | "all")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="regression">Regression</SelectItem>
            <SelectItem value="accessibility">Accessibility</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "my-templates" | "public")}>
        <TabsList>
          <TabsTrigger value="my-templates">My Templates</TabsTrigger>
          <TabsTrigger value="public">Public Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="my-templates" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || categoryFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first template to get started"}
                </p>
                {!searchQuery && categoryFilter === "all" && (
                  <Button onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const CategoryIcon = categoryIcons[template.category]
                const categoryColor = categoryColors[template.category]

                return (
                  <Card key={template.id} className="relative group hover:shadow-lg transition-shadow">
                    {/* Category indicator */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${categoryColor} rounded-t-lg`} />

                    <CardHeader className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleFavorite(template)}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                template.is_favorite
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteTemplate(template.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {template.description && (
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.template_content.testCaseCount} tests
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="font-mono">
                            {template.template_content.model.includes("claude") ? "Claude" : "GPT"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Coverage:</span>
                          <span className="capitalize">{template.template_content.coverage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Used:</span>
                          <span>{template.usage_count} times</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          // This will be used when integrating with the generator
                          toast.success("Template selected (integrate with generator)")
                        }}
                      >
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No public templates available</h3>
                <p className="text-sm text-muted-foreground">
                  Check back later for community templates
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const CategoryIcon = categoryIcons[template.category]
                const categoryColor = categoryColors[template.category]

                return (
                  <Card key={template.id} className="relative hover:shadow-lg transition-shadow">
                    <div className={`absolute top-0 left-0 w-full h-1 ${categoryColor} rounded-t-lg`} />

                    <CardHeader className="pt-6">
                      <div className="flex items-start gap-2">
                        <CategoryIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="line-clamp-2 mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.template_content.testCaseCount} tests
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Used {template.usage_count} times by the community
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => duplicateTemplate(template)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          toast.success("Template selected (integrate with generator)")
                        }}
                      >
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
       <DialogContent
  className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-3xl lg:max-w-4xl"
>
  <DialogHeader>
    <DialogTitle>
      {editingTemplate ? "Edit Template" : "Create New Template"}
    </DialogTitle>
    <DialogDescription>
      {editingTemplate
        ? "Update your template settings"
        : "Save your test generation preferences as a reusable template"}
    </DialogDescription>
  </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., API Security Tests"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when to use this template..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as TemplateCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Functional Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="security">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="performance">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Performance Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="integration">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Integration Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="regression">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Regression Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="accessibility">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Accessibility Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Other
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Generation Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Generation Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet-20241022">
                        Claude 3.5 Sonnet (Recommended)
                      </SelectItem>
                      <SelectItem value="claude-3-5-haiku-20241022">
                        Claude 3.5 Haiku (Fast)
                      </SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (Alternative)</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini (Economical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testCaseCount">Number of Test Cases</Label>
                  <Select
                    value={formData.testCaseCount.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, testCaseCount: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 test cases</SelectItem>
                      <SelectItem value="10">10 test cases</SelectItem>
                      <SelectItem value="15">15 test cases</SelectItem>
                      <SelectItem value="20">20 test cases</SelectItem>
                      <SelectItem value="30">30 test cases</SelectItem>
                      <SelectItem value="50">50 test cases</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverage">Coverage Level</Label>
                <Select
                  value={formData.coverage}
                  onValueChange={(value) =>
                    setFormData({ ...formData, coverage: value as 'standard' | 'comprehensive' | 'exhaustive' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard - Main functionality</SelectItem>
                    <SelectItem value="comprehensive">
                      Comprehensive - Includes edge cases
                    </SelectItem>
                    <SelectItem value="exhaustive">Exhaustive - All scenarios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Edge Cases</Label>
                    <p className="text-xs text-muted-foreground">
                      Generate tests for boundary conditions
                    </p>
                  </div>
                  <Switch
                    checked={formData.includeEdgeCases}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeEdgeCases: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Negative Tests</Label>
                    <p className="text-xs text-muted-foreground">
                      Generate tests for error scenarios
                    </p>
                  </div>
                  <Switch
                    checked={formData.includeNegativeTests}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includeNegativeTests: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

         <DialogFooter>
    <Button
      variant="outline"
      onClick={() => {
        setShowDialog(false)
        setEditingTemplate(null)
        resetForm()
      }}
    >
      Cancel
    </Button>
    <Button onClick={saveTemplate} disabled={loading || !formData.name.trim()}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : editingTemplate ? (
        "Update Template"
      ) : (
        "Create Template"
      )}
    </Button>
  </DialogFooter>
</DialogContent>
       
      </Dialog>
    </div>
  )
}