"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2, X } from "lucide-react"

interface AddRequirementModalProps {
  onRequirementAdded?: () => void
  children?: React.ReactNode
}

export function AddRequirementModal({ onRequirementAdded, children }: AddRequirementModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([''])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'functional',
    priority: 'medium',
    externalId: '',
    source: 'manual'
  })

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

      // Filter out empty acceptance criteria
      const validCriteria = acceptanceCriteria.filter(criteria => criteria.trim() !== '')

      const { error } = await supabase
        .from('requirements')
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          external_id: formData.externalId || null,
          acceptance_criteria: validCriteria.length > 0 ? validCriteria : null,
          priority: formData.priority,
          source: formData.source,
          status: 'draft'
        })

      if (error) throw error

      toast.success('Requirement created successfully')
      setOpen(false)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'functional',
        priority: 'medium',
        externalId: '',
        source: 'manual'
      })
      setAcceptanceCriteria([''])
      onRequirementAdded?.()

    } catch (error) {
      console.error('Error creating requirement:', error)
      toast.error('Failed to create requirement')
    } finally {
      setLoading(false)
    }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Requirement</DialogTitle>
          <DialogDescription>
            Define a new requirement that can be used to generate test cases.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="user_story">User Story</SelectItem>
                  <SelectItem value="use_case">Use Case</SelectItem>
                  <SelectItem value="non_functional">Non-Functional</SelectItem>
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
              placeholder="e.g., JIRA-123, REQ-456"
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

          {/* Source */}
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
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
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
              disabled={loading}
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
      </DialogContent>
    </Dialog>
  )
}