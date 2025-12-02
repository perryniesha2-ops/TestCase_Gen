"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ExternalLink,
  MoreHorizontal,
  Link as LinkIcon,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  X
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
  metadata?: Record<string, string | number | boolean>
  created_at: string
  updated_at: string
  test_case_count: number
  coverage_percentage: number
}

interface TestCase {
  id: string
  title: string
  test_type: string
  priority: string
  status: string
}

interface RequirementTestCase {
  id: string
  requirement_id: string
  test_case_id: string
  coverage_type: 'direct' | 'indirect' | 'negative'
  test_cases?: TestCase
}

interface RequirementsListProps {
  onRequirementSelected?: (requirement: Requirement) => void
  selectable?: boolean
}

export function RequirementsList({ onRequirementSelected, selectable = false }: RequirementsListProps) {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [linkedTestCases, setLinkedTestCases] = useState<RequirementTestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedCoverageTypes, setSelectedCoverageTypes] = useState<Record<string, string>>({})


  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to view requirements')
        return
      }

      // Fetch requirements
      const { data: reqData, error: reqError } = await supabase
        .from('requirements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (reqError) throw reqError

      // Calculate coverage for each requirement
      const requirementsWithCoverage = await Promise.all(
        (reqData || []).map(async (req) => {
          // Get linked test cases
          const { data: linkData } = await supabase
            .from('requirement_test_cases')
            .select('test_case_id')
            .eq('requirement_id', req.id)

          const testCaseIds = linkData?.map(link => link.test_case_id) || []
          
          if (testCaseIds.length > 0) {
            // Get latest execution status for each test case
            const { data: execData } = await supabase
              .from('test_executions')
              .select('test_case_id, execution_status')
              .in('test_case_id', testCaseIds)
              .order('created_at', { ascending: false })

            // Get latest execution per test case
            const latestExecutions = execData?.reduce((acc: Record<string, string>, exec) => {
              if (!acc[exec.test_case_id]) {
                acc[exec.test_case_id] = exec.execution_status
              }
              return acc
            }, {}) || {}

            const passedCount = Object.values(latestExecutions).filter(status => status === 'passed').length
            const coveragePercentage = testCaseIds.length > 0 ? Math.round((passedCount / testCaseIds.length) * 100) : 0

            return {
              ...req,
              test_case_count: testCaseIds.length,
              coverage_percentage: coveragePercentage
            }
          }

          return {
            ...req,
            test_case_count: 0,
            coverage_percentage: 0
          }
        })
      )

      setRequirements(requirementsWithCoverage)

      // Fetch test cases for linking
      const { data: testCaseData, error: testCaseError } = await supabase
        .from('test_cases')
        .select('id, title, test_type, priority, status')
        .eq('user_id', user.id)
        .order('title')

      if (testCaseError) {
        // New users might not have test cases yet
        setTestCases([])
      } else {
        setTestCases(testCaseData || [])
      }

    } catch (error) {
      console.error('Error fetching requirements:', error)
      toast.error('Failed to load requirements')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLinkedTestCases(requirementId: string) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('requirement_test_cases')
        .select(`
          *,
          test_cases(id, title, test_type, priority, status)
        `)
        .eq('requirement_id', requirementId)

      if (error) throw error
      setLinkedTestCases(data || [])
    } catch (error) {
      console.error('Error fetching linked test cases:', error)
      setLinkedTestCases([])
    }
  }

  async function linkTestCase(testCaseId: string, coverageType: string) {
    if (!selectedRequirement) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('requirement_test_cases')
        .insert({
          requirement_id: selectedRequirement.id,
          test_case_id: testCaseId,
          coverage_type: coverageType
        })

      if (error) throw error

      toast.success('Test case linked successfully')
      fetchLinkedTestCases(selectedRequirement.id)
      fetchData() // Refresh coverage stats
    } catch (error) {
      console.error('Error linking test case:', error)
      toast.error('Failed to link test case')
    }
  }

  async function unlinkTestCase(linkId: string) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('requirement_test_cases')
        .delete()
        .eq('id', linkId)

      if (error) throw error

      toast.success('Test case unlinked')
      if (selectedRequirement) {
        fetchLinkedTestCases(selectedRequirement.id)
        fetchData() // Refresh coverage stats
      }
    } catch (error) {
      console.error('Error unlinking test case:', error)
      toast.error('Failed to unlink test case')
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
      fetchData()
    } catch (error) {
      console.error('Error deleting requirement:', error)
      toast.error('Failed to delete requirement')
    }
  }

  function openLinkDialog(requirement: Requirement) {
    setSelectedRequirement(requirement)
    fetchLinkedTestCases(requirement.id)
    setShowLinkDialog(true)
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

  function getCoverageColor(percentage: number) {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getCoverageIcon(percentage: number) {
    if (percentage >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (percentage >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <Target className="h-4 w-4 text-red-600" />
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
  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Pagination
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRequirements = filteredRequirements.slice(startIndex, endIndex)

  // Get available test cases for linking
  const availableTestCases = testCases.filter(tc => 
    !linkedTestCases.some(link => link.test_case_id === tc.id)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
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
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

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
              <TableHead className="w-[120px]">Test Coverage</TableHead>
              <TableHead className="w-[120px]">External ID</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRequirements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {requirements.length === 0 ? 'No requirements yet' : 'No requirements match your filters'}
                    </p>
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
                              requirement.coverage_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${requirement.coverage_percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRequirement(requirement)
                          setShowDetailsDialog(true)
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          openLinkDialog(requirement)
                        }}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link Tests
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          toast.info('Test generation from requirements coming soon')
                        }}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Tests
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          toast.info('Edit functionality coming soon')
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(requirement)
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

      {/* Details Dialog */}
      {selectedRequirement && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedRequirement.title}</span>
                  <Button
                    onClick={() => openLinkDialog(selectedRequirement)}
                    size="sm"
                    variant="outline"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Tests ({selectedRequirement.test_case_count})
                  </Button>
                
              </DialogTitle>
            </DialogHeader>
            
            {/* Move badges outside DialogDescription to fix nesting error */}
            <div className="flex items-center gap-2 flex-wrap -mt-2">
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
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className={`text-sm font-medium ${getCoverageColor(selectedRequirement.coverage_percentage)}`}>
                  {selectedRequirement.coverage_percentage}% test coverage
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedRequirement.description}
                </p>
              </div>

              {selectedRequirement.acceptance_criteria && 
               Array.isArray(selectedRequirement.acceptance_criteria) && 
               selectedRequirement.acceptance_criteria.length > 0 && (
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

              {selectedRequirement.test_case_count > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Test Coverage Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Linked Test Cases</p>
                      <p className="text-2xl font-bold">{selectedRequirement.test_case_count}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pass Rate</p>
                      <p className={`text-2xl font-bold ${getCoverageColor(selectedRequirement.coverage_percentage)}`}>
                        {selectedRequirement.coverage_percentage}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Test Case Linking Dialog */}
     <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
  <DialogContent
    className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0"
    onInteractOutside={(e) => e.preventDefault()}
  >
    {/* Sticky header */}
    <DialogHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <DialogTitle className="text-lg font-semibold">
            Link Test Cases
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Manage test case links for:{" "}
            <span className="font-medium">
              {selectedRequirement?.title}
            </span>
          </DialogDescription>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full shrink-0"
          onClick={() => setShowLinkDialog(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </DialogHeader>

    {/* Scrollable body with padding */}
    <div className="flex-1 overflow-y-auto">
      <Tabs defaultValue="linked" className="w-full">
        {/* Tabs List with side padding */}
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="linked">
              Linked Tests ({linkedTestCases.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              Available Tests ({availableTestCases.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Linked tab */}
        <TabsContent value="linked" className="px-6 py-4 space-y-4">
          {linkedTestCases.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No test cases linked yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedTestCases.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">
                      {link.test_cases?.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {link.test_cases?.test_type}
                      </Badge>
                      <Badge variant="outline">
                        {link.coverage_type} coverage
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => unlinkTestCase(link.id)}
                  >
                    Unlink
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Available tab */}
        <TabsContent value="available" className="px-6 py-4 space-y-4">
          {availableTestCases.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {testCases.length === 0
                  ? "No test cases created yet. Create test cases first to link them to requirements."
                  : "All test cases are already linked"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableTestCases.map((testCase) => {
                const selectedType =
                  selectedCoverageTypes[testCase.id] || "direct"

                return (
                  <div
                    key={testCase.id}
                    className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{testCase.title}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {testCase.test_type}
                        </Badge>
                        <Badge variant="outline">
                          {testCase.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedType}
                        onValueChange={(value) => {
                          setSelectedCoverageTypes((prev) => ({
                            ...prev,
                            [testCase.id]: value,
                          }))
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Coverage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="indirect">Indirect</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        onClick={() => {
                          linkTestCase(testCase.id, selectedType)
                          setSelectedCoverageTypes((prev) => {
                            const updated = { ...prev }
                            delete updated[testCase.id]
                            return updated
                          })
                        }}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Link
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  </DialogContent>
</Dialog>
    </div>
  )
}