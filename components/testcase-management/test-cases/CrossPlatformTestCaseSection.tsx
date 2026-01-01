"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TabsContent } from "@/components/ui/tabs"
import {
  CheckCircle2,
  XCircle,
  Circle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react"

import type { CrossPlatformTestCase, TestExecution } from "@/types/test-cases"
import { CrossPlatformBulkActionsToolbar } from "./toolbars/CrossPlatformBulkActionsToolbar"

type Props = {
  cases: CrossPlatformTestCase[]
  paginated: CrossPlatformTestCase[]
  filteredCount: number

  execution: TestExecution
  platformIcons: Record<string, any>

  selectedIds: Set<string>
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void

  onBulkApprove: (ids: string[]) => Promise<void>
  onBulkReject: (ids: string[]) => Promise<void>
  onBulkUpdate: (ids: string[], updates: Partial<CrossPlatformTestCase>) => Promise<void>
  onBulkDelete: (ids: string[]) => Promise<void>
  onRun: (tc: CrossPlatformTestCase) => void

  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  onPrevPage: () => void
  onNextPage: () => void

  getPriorityColor: (priority: string) => string
  getApprovalStatusBadge: (status?: string) => React.ReactNode
  getRelativeTime: (date: string) => string

  onOpenDetails: (tc: CrossPlatformTestCase) => void
}

export function CrossPlatformTestCaseSection(props: Props) {
  const {
    cases,
    paginated,
    filteredCount,
    execution,
    platformIcons,
    selectedIds,
    selectAll,
    deselectAll,
    toggleSelection,
    onBulkApprove,
    onBulkReject,
    onBulkUpdate,
    onBulkDelete,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    onPrevPage,
    onNextPage,
    getPriorityColor,
    getApprovalStatusBadge,
    getRelativeTime,
    onOpenDetails,
  } = props

  const passed = cases.filter((tc) => execution[tc.id]?.status === "passed").length
  const failed = cases.filter((tc) => execution[tc.id]?.status === "failed").length
  const blocked = cases.filter((tc) => execution[tc.id]?.status === "blocked").length
  const inProgress = cases.filter((tc) => execution[tc.id]?.status === "in_progress").length
  const notRun = cases.filter((tc) => execution[tc.id]?.status === "not_run").length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">{filteredCount}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{passed}</div>
          <div className="text-sm text-muted-foreground">Passed</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{failed}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">{blocked}</div>
          <div className="text-sm text-muted-foreground">Blocked</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-500">{notRun}</div>
          <div className="text-sm text-muted-foreground">Not Run</div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <CrossPlatformBulkActionsToolbar
          selectedIds={selectedIds}
          allTestCases={cases}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onBulkApprove={onBulkApprove}
          onBulkReject={onBulkReject}
          onBulkUpdate={onBulkUpdate}
          onBulkDelete={onBulkDelete}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.size === paginated.length && paginated.length > 0}
                  onCheckedChange={(checked) => (checked ? selectAll() : deselectAll())}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px]">Platform</TableHead>
              <TableHead className="w-[120px]">Framework</TableHead>
              <TableHead className="w-[120px]">Priority</TableHead>
              <TableHead className="w-[140px]">Created</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No cross-platform test cases found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((testCase) => {
                const exec = execution[testCase.id]
                const Icon = platformIcons[testCase.platform]

                return (
                  <TableRow key={testCase.id} className="hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(testCase.id)} onCheckedChange={() => toggleSelection(testCase.id)} />
                    </TableCell>

                    <TableCell className="font-medium cursor-pointer" onClick={() => onOpenDetails(testCase)}>
                      <div className="flex items-center gap-2">
                        {exec?.status === "passed" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {exec?.status === "failed" && <XCircle className="h-4 w-4 text-red-600" />}
                        {exec?.status === "blocked" && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                        {exec?.status === "skipped" && <Circle className="h-4 w-4 text-gray-400" />}
                        {exec?.status === "in_progress" && <Clock className="h-4 w-4 text-blue-600" />}
                        {exec?.status === "not_run" && <Circle className="h-4 w-4 text-gray-400" />}
                        <span className="truncate">{testCase.title}</span>
                      </div>
                    </TableCell>

                    <TableCell>{getApprovalStatusBadge(testCase.status)}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        <Badge variant="default">{testCase.platform}</Badge>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">{testCase.framework}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge className={getPriorityColor(testCase.priority)}>{testCase.priority}</Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm">
                      {getRelativeTime(testCase.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredCount)} of {filteredCount} test cases
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPrevPage} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={onNextPage} disabled={currentPage === totalPages}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
