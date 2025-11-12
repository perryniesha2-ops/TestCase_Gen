"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Loader2,
  Search,
  Filter,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  ExternalLink
} from "lucide-react"

interface Requirement {
  id: string
  title: string
  description: string
  type: 'functional' | 'user_story' | 'use_case' | 'non_functional'
  external_id: string | null
  acceptance_criteria: string[] | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'draft' | 'active' | 'archived'
  source: string
  created_at: string
  updated_at: string
}

interface RequirementsListProps {
  onRequirementSelected?: (requirement: Requirement) => void
  selectable?: boolean
}

export function RequirementsList({ onRequirementSelected, selectable = false }: RequirementsListProps) {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchRequirements()
  }, [])

  async function fetchRequirements() {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setRequirements(data || [])
    } catch (error) {
      console.error('Error fetching requirements:', error)
      toast.error('Failed to load requirements')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(requirement: Requirement) {
    if (!confirm(`Are you sure you want to delete "${requirement.title}"?`)) {
      return
    }

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('requirements')
        .delete()
        .eq('id', requirement.id)

      if (error) throw error

      toast.success('Requirement deleted successfully')
      fetchRequirements()
    } catch (error) {
      console.error('Error deleting requirement:', error)
      toast.error('Failed to delete requirement')
    }
  }

  function getTypeVariant(type: string): "default" | "secondary" | "outline" {
    switch (type) {
      case 'functional': return 'default'
      case 'user_story': return 'secondary'
      case 'use_case': return 'outline'
      case 'non_functional': return 'outline'
      default: return 'default'
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'functional': return 'bg-blue-500 text-white'
      case 'user_story': return 'bg-green-500 text-white'
      case 'use_case': return 'bg-purple-500 text-white'
      case 'non_functional': return 'bg-orange-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-black'
      case 'low': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  function getStatusBadge(status: 'draft' | 'active' | 'archived') {
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      draft: { variant: 'outline', label: 'Draft' },
      active: { variant: 'default', label: 'Active' },
      archived: { variant: 'secondary', label: 'Archived' }
    }
    const config = variants[status] || variants.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  function handleRowClick(requirement: Requirement) {
    if (selectable && onRequirementSelected) {
      onRequirementSelected(requirement)
    } else {
      setSelectedRequirement(requirement)
      setShowDetailsDialog(true)
    }
  }

  // Filter requirements
  const filteredRequirements = requirements.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRequirements = filteredRequirements.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requirements..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="default">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="default">
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">External ID</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[120px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No requirements found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRequirements.map((requirement) => (
                <TableRow 
                  key={requirement.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectable ? 'hover:bg-primary/10' : ''}`}
                  onClick={() => handleRowClick(requirement)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{requirement.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {requirement.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(requirement.type)}>
                      {requirement.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(requirement.priority)}>
                      {requirement.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(requirement.status)}
                  </TableCell>
                  <TableCell>
                    {requirement.external_id ? (
                      <div className="flex items-center gap-1 text-sm">
                        <ExternalLink className="h-3 w-3" />
                        {requirement.external_id}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {getRelativeTime(requirement.created_at)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRequirement(requirement)
                          setShowDetailsDialog(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.info('Edit functionality coming soon')
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(requirement)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredRequirements.length)} of {filteredRequirements.length} requirements
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Requirement Details Dialog */}
      {selectedRequirement && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedRequirement.title}</span>
                <Button
                  onClick={() => {
                    toast.info('Test case generation from requirements coming soon')
                  }}
                  size="sm"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Tests
                </Button>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap pt-2">
                <Badge className={getTypeColor(selectedRequirement.type)}>
                  {selectedRequirement.type.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(selectedRequirement.priority)}>
                  {selectedRequirement.priority}
                </Badge>
                {getStatusBadge(selectedRequirement.status)}
                {selectedRequirement.external_id && (
                  <Badge variant="outline">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {selectedRequirement.external_id}
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedRequirement.description}
                </p>
              </div>

              {/* Acceptance Criteria */}
              {selectedRequirement.acceptance_criteria && selectedRequirement.acceptance_criteria.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Acceptance Criteria</h4>
                  <ul className="space-y-2">
                    {selectedRequirement.acceptance_criteria.map((criteria, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded mt-0.5">
                          {index + 1}
                        </span>
                        <span>{criteria}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium">Source</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedRequirement.source}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedRequirement.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}