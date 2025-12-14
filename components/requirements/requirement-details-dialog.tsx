// components/requirements/requirement-details-dialog.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Link as LinkIcon,
  ExternalLink,
  BarChart3,
  FolderOpen
} from "lucide-react"
import {
  getTypeColor,
  getPriorityColor,
  getStatusBadge,
  getCoverageColor,
  getProjectColor
} from "@/lib/utils/requirement-helpers"
import type { Requirement } from "@/types/requirements"

interface RequirementDetailsDialogProps {
  requirement: Requirement
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenLinkDialog: () => void
}

export function RequirementDetailsDialog({
  requirement,
  open,
  onOpenChange,
  onOpenLinkDialog
}: RequirementDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{requirement.title}</span>
            <Button
              onClick={onOpenLinkDialog}
              size="sm"
              variant="outline"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Tests ({requirement.test_case_count})
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          {requirement.projects && (
            <Badge variant="outline" className="gap-1">
              <FolderOpen className={`h-3 w-3 ${getProjectColor(requirement.projects.color)}`} />
              {requirement.projects.name}
            </Badge>
          )}
          
          <Badge className={getTypeColor(requirement.type)}>
            {requirement.type.replace('_', ' ')}
          </Badge>
          
          <Badge className={getPriorityColor(requirement.priority)}>
            {requirement.priority}
          </Badge>
          
          {getStatusBadge(requirement.status)}
          
          {requirement.external_id && (
            <Badge variant="outline">
              <ExternalLink className="h-3 w-3 mr-1" />
              {requirement.external_id}
            </Badge>
          )}
          
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className={`text-sm font-medium ${getCoverageColor(requirement.coverage_percentage)}`}>
              {requirement.coverage_percentage}% test coverage
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {requirement.description}
            </p>
          </div>

          {/* Acceptance Criteria */}
          {requirement.acceptance_criteria && 
           Array.isArray(requirement.acceptance_criteria) && 
           requirement.acceptance_criteria.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Acceptance Criteria</h4>
              <ul className="space-y-2">
                {requirement.acceptance_criteria.map((criteria, index) => (
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

          {/* Coverage Summary */}
          {requirement.test_case_count > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Test Coverage Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Linked Test Cases</p>
                  <p className="text-2xl font-bold">{requirement.test_case_count}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Pass Rate</p>
                  <p className={`text-2xl font-bold ${getCoverageColor(requirement.coverage_percentage)}`}>
                    {requirement.coverage_percentage}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            {requirement.projects && (
              <div>
                <p className="text-sm font-medium">Project</p>
                <div className="flex items-center gap-2 mt-1">
                  <FolderOpen className={`h-4 w-4 ${getProjectColor(requirement.projects.color)}`} />
                  <span className="text-sm">{requirement.projects.name}</span>
                </div>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium">Source</p>
              <p className="text-sm text-muted-foreground capitalize">
                {requirement.source}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {new Date(requirement.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}