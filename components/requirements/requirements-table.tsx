// components/requirements/requirements-table.tsx
"use client"

import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  ExternalLink,
  MoreHorizontal,
  Link as LinkIcon,
  FolderOpen
} from "lucide-react"
import { toast } from "sonner"
import { 
  getTypeColor, 
  getPriorityColor, 
  getStatusBadge,
  getCoverageIcon,
  getCoverageColor,
  getProjectColor,
  getRelativeTime 
} from "@/lib/utils/requirement-helpers"
import type { Requirement } from "@/types/requirements"

interface RequirementsTableProps {
  requirements: Requirement[]
  selectable?: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  itemsPerPage: number
  onRowClick: (requirement: Requirement) => void
  onOpenLinkDialog: (requirement: Requirement) => void
  onOpenEditDialog: (requirement: Requirement) => void
  onDelete: (requirement: Requirement) => void
  onPageChange: (page: number) => void
}

export function RequirementsTable({
  requirements,
  selectable = false,
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onRowClick,
  onOpenLinkDialog,
  onOpenEditDialog,
  onDelete,
  onPageChange
}: RequirementsTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[140px]">Project</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Coverage</TableHead>
              <TableHead className="w-[120px]">External ID</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No requirements match your filters
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requirements.map((requirement) => (
                <RequirementRow
                  key={requirement.id}
                  requirement={requirement}
                  selectable={selectable}
                  onRowClick={onRowClick}
                  onOpenLinkDialog={onOpenLinkDialog}
                  onOpenEditDialog={onOpenEditDialog}
                  onDelete={onDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{endIndex} of {totalCount} requirements
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface RequirementRowProps {
  requirement: Requirement
  selectable: boolean
  onRowClick: (requirement: Requirement) => void
  onOpenLinkDialog: (requirement: Requirement) => void
  onOpenEditDialog: (requirement: Requirement) => void
  onDelete: (requirement: Requirement) => void
}

function RequirementRow({
  requirement,
  selectable,
  onRowClick,
  onOpenLinkDialog,
  onOpenEditDialog,
  onDelete
}: RequirementRowProps) {
  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 ${selectable ? 'hover:bg-primary/10' : ''}`}
      onClick={() => onRowClick(requirement)}
    >
      {/* Title & Description */}
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{requirement.title}</div>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {requirement.description}
          </div>
        </div>
      </TableCell>

      {/* Project */}
      <TableCell>
        {requirement.projects ? (
          <div className="flex items-center gap-2">
            <FolderOpen className={`h-4 w-4 ${getProjectColor(requirement.projects.color)}`} />
            <span className="text-sm truncate">{requirement.projects.name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No project</span>
        )}
      </TableCell>

      {/* Type */}
      <TableCell>
        <Badge className={getTypeColor(requirement.type)}>
          {requirement.type.replace('_', ' ')}
        </Badge>
      </TableCell>

      {/* Priority */}
      <TableCell>
        <Badge className={getPriorityColor(requirement.priority)}>
          {requirement.priority}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        {getStatusBadge(requirement.status)}
      </TableCell>

      {/* Coverage */}
      <TableCell>
        <div className="flex items-center gap-2">
          {getCoverageIcon(requirement.coverage_percentage)}
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${getCoverageColor(requirement.coverage_percentage)}`}>
              {requirement.coverage_percentage}%
            </span>
            <span className="text-xs text-muted-foreground">
              {requirement.test_case_count} tests
            </span>
          </div>
          {requirement.test_case_count > 0 && (
            <div className="w-16 bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all ${
                  requirement.coverage_percentage >= 80 ? 'bg-green-500' :
                  requirement.coverage_percentage >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${requirement.coverage_percentage}%` }}
              />
            </div>
          )}
        </div>
      </TableCell>

      {/* External ID */}
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

      {/* Created */}
      <TableCell className="text-muted-foreground text-sm">
        {getRelativeTime(requirement.created_at)}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              onRowClick(requirement)
            }}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              onOpenLinkDialog(requirement)
            }}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Tests
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              toast.info('Test generation coming soon')
            }}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Tests
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
           <DropdownMenuItem onClick={(e) => { 
            e.stopPropagation() 
            onOpenEditDialog(requirement) }}> 
            <Edit className="h-4 w-4 mr-2" /> 
            Edit 
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
                onDelete(requirement)
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}