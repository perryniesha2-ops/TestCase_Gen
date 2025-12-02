"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Plus, Loader2, X, FileText, Settings } from "lucide-react"

interface AddRequirementModalProps {
  onRequirementAdded?: () => void
  children?: React.ReactNode
}

export function AddRequirementModal({ onRequirementAdded, children }: AddRequirementModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([''])
  const [metadata, setMetadata] = useState<Record<string, string | number | boolean>>({})
  const [autoGenerateTests, setAutoGenerateTests] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirement_type: 'functional',
    type: 'functional', // Legacy support
    priority: 'medium',
    externalId: '',
    source: 'manual',
    status: 'draft'
  })

  // Metadata fields
  const [metadataFields, setMetadataFields] = useState<Array<{key: string, value: string, type: 'text' | 'number' | 'boolean'}>>([])

  function addAcceptanceCriteria() {
    setAcceptanceCriteria([...acceptanceCriteria, ''])
  }

  function removeAcceptanceCriteria(index: number) {
    if (acceptanceCriteria.length > 1) {
      setAcceptanceCriteria(acceptanceCriteria.filter((_, i) => i !== index))
    }
  }

  function updateAcceptanceCriteria(index: number, value: string) {
    const newCriteria = acceptanceCriteria.map((criteria, i) => 
      i === index ? value : criteria
    )
    setAcceptanceCriteria(newCriteria)
  }

  function addMetadataField() {
    setMetadataFields([...metadataFields, { key: '', value: '', type: 'text' }])
  }

  function removeMetadataField(index: number) {
    setMetadataFields(metadataFields.filter((_, i) => i !== index))
  }

  function updateMetadataField(index: number, field: 'key' | 'value' | 'type', value: string) {
    const newFields = metadataFields.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    )
    setMetadataFields(newFields)
  }

  function buildMetadata(): Record<string, string | number | boolean> {
    const meta: Record<string, string | number | boolean> = {}
    
    metadataFields.forEach(field => {
      if (field.key && field.value) {
        let value: string | number | boolean = field.value
        if (field.type === 'number') {
          value = Number(field.value)
        } else if (field.type === 'boolean') {
          value = field.value.toLowerCase() === 'true'
        }
        meta[field.key] = value
      }
    })

    // Add system metadata
    meta.created_via = 'manual_entry'
    meta.auto_generate_tests = autoGenerateTests
    if (formData.externalId) {
      meta.external_reference = formData.externalId
    }

    return meta
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to add requirements')
        return
      }

      const validCriteria = acceptanceCriteria.filter(criteria => criteria.trim() !== '')
      const builtMetadata = buildMetadata()

      const requirementData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        requirement_type: formData.requirement_type,
        type: formData.type, // For backward compatibility
        external_id: formData.externalId || null,
        acceptance_criteria: validCriteria.length > 0 ? validCriteria : null,
        priority: formData.priority,
        source: formData.source,
        status: formData.status,
        metadata: Object.keys(builtMetadata).length > 0 ? builtMetadata : null
      }

      const { data: requirement, error } = await supabase
        .from('requirements')
        .insert(requirementData)
        .select()
        .single()

      if (error) throw error

      toast.success('Requirement created successfully')
      
      // If auto-generate tests is enabled, show info message
      if (autoGenerateTests) {
        toast.info('Test case generation will be available soon!')
      }

      setOpen(false)
      resetForm()
      onRequirementAdded?.()

    } catch (error) {
      console.error('Error creating requirement:', error)
      toast.error('Failed to create requirement')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      requirement_type: 'functional',
      type: 'functional',
      priority: 'medium',
      externalId: '',
      source: 'manual',
      status: 'draft'
    })
    setAcceptanceCriteria([''])
    setMetadataFields([])
    setAutoGenerateTests(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Requirement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent   className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
  onInteractOutside={(e) => e.preventDefault()}>
  <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
     <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
          <DialogTitle>Create New Requirement</DialogTitle>
          <DialogDescription>
            Define a new requirement that can be used to generate test cases and track coverage.
          </DialogDescription>
                </div>
<Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={() => {
          setOpen(false)
          resetForm()
        }}
      >
        <X className="h-4 w-4" />
      </Button>
      </div>
        </DialogHeader>
  <div className="flex-1 overflow-y-auto px-6 py-4">

          <Tabs defaultValue="basic" className="w-full space-y-6">
      <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/40 p-1">
        <TabsTrigger value="basic" className="flex items-center gap-2 py-2">
          <FileText className="h-4 w-4" />
              Basic Info
          </TabsTrigger>
        <TabsTrigger value="advanced" className="flex items-center gap-2 py-2">
          <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-8">
            <TabsContent value="basic" className="space-y-6 pt-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., User Authentication System"
                  required
                  disabled={loading}
                />
              </div>
              

              {/* Type and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Requirement Type <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.requirement_type} 
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      requirement_type: value,
                      type: value // Keep legacy field in sync
                    })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="functional">Functional</SelectItem>
                      <SelectItem value="non_functional">Non-Functional</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      {/* Legacy options for backward compatibility */}
                      <SelectItem value="user_story">User Story</SelectItem>
                      <SelectItem value="use_case">Use Case</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="implemented">Implemented</SelectItem>
                      <SelectItem value="tested">Tested</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select 
                    value={formData.source} 
                    onValueChange={(value) => setFormData({ ...formData, source: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="import">File Import</SelectItem>
                      <SelectItem value="jira">JIRA Integration</SelectItem>
                      <SelectItem value="azure">Azure DevOps</SelectItem>
                      <SelectItem value="confluence">Confluence</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the requirement. Be specific about what needs to be implemented or achieved..."
                  rows={5}
                  required
                  disabled={loading}
                />
              </div>

              {/* External ID */}
              <div className="space-y-2">
                <Label htmlFor="externalId">External ID (Optional)</Label>
                <Input
                  id="externalId"
                  value={formData.externalId}
                  onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                  placeholder="e.g., JIRA-123, REQ-456, STORY-789"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Reference ID from external tools like JIRA, Azure DevOps, etc.
                </p>
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Acceptance Criteria (Optional)</Label>
                  <Button
                    type="button"
                    onClick={addAcceptanceCriteria}
                    size="sm"
                    variant="outline"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                </div>
                <div className="space-y-3">
                  {acceptanceCriteria.map((criteria, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-none w-8 h-9 bg-muted rounded flex items-center justify-center text-sm font-mono">
                        {index + 1}
                      </div>
                      <Input
                        value={criteria}
                        onChange={(e) => updateAcceptanceCriteria(index, e.target.value)}
                        placeholder={`Acceptance criteria ${index + 1}...`}
                        disabled={loading}
                        className="flex-1"
                      />
                      {acceptanceCriteria.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAcceptanceCriteria(index)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Define specific criteria that must be met for this requirement to be considered complete.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              {/* Test Generation Options */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Test Case Generation</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-generate">Auto-generate test cases</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically generate test cases when this requirement is created
                    </p>
                  </div>
                  <Switch
                    id="auto-generate"
                    checked={autoGenerateTests}
                    onCheckedChange={setAutoGenerateTests}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  ⚠️ Auto-generation feature is coming soon!
                </p>
              </div>

              {/* Custom Metadata */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Custom Metadata (Optional)</Label>
                  <Button
                    type="button"
                    onClick={addMetadataField}
                    size="sm"
                    variant="outline"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>
                
                {metadataFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg text-center">
                    No custom metadata fields added yet. Click &quot;Add Field&quot; to include custom properties.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metadataFields.map((field, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Key</Label>
                          <Input
                            value={field.key}
                            onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                            placeholder="e.g., story_points"
                            disabled={loading}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-4">
                          <Label className="text-xs">Value</Label>
                          <Input
                            value={field.value}
                            onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                            placeholder="e.g., 5"
                            disabled={loading}
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateMetadataField(index, 'type', value)}
                            disabled={loading}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMetadataField(index)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Add custom properties to track additional information like story points, business value, technical complexity, etc.
                </p>
              </div>

              {/* Preview Metadata */}
              {metadataFields.some(f => f.key && f.value) && (
                <div className="space-y-2">
                  <Label>Metadata Preview</Label>
                  <div className="bg-muted p-3 rounded-lg">
                    <pre className="text-xs text-muted-foreground">
                      {JSON.stringify(buildMetadata(), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Actions - Always visible */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !formData.title || !formData.description}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Requirement
                  </>
                )}
              </Button>
            </div>
          </form>
        </Tabs>
                  </div>

      </DialogContent>
    </Dialog>
  )
}