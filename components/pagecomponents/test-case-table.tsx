"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DialogFooter,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  CheckCircle2, 
  XCircle, 
  Circle, 
  Loader2,
  AlertTriangle,
  Search,
  Filter,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Globe,
  Eye,
  Zap,
  FlaskConical,
  Layers,
  Plus,
  Edit3,
  Trash2,
  MoreHorizontal,
  Save,
  X,
  Clock,
  MessageSquare,
  RotateCcw
} from "lucide-react"

// Enhanced types to support new test management features
type ExecutionStatus = 'not_run' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped'

interface TestCase {
  id: string
  generation_id: string
  title: string
  description: string
  test_type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  preconditions: string | null
  test_steps: Array<{
    step_number: number
    action: string
    expected: string
  }>
  expected_result: string
  is_edge_case: boolean
  status: 'draft' | 'active' | 'archived'
  execution_status: ExecutionStatus
  created_at: string
}

interface CrossPlatformTestCase {
  id: string
  suite_id: string
  platform: string
  framework: string
  title: string
  description: string
  preconditions: string[]
  steps: string[]
  expected_results: string[]
  automation_hints?: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  execution_status: ExecutionStatus
  created_at: string
  cross_platform_test_suites?: {
    requirement: string
    user_id: string
  }
}

interface Generation {
  id: string
  title: string
}

interface CrossPlatformSuite {
  id: string
  requirement: string
  platforms: string[]
  generated_at: string
}

// Enhanced execution interface with new test management features
interface TestExecution {
  [testCaseId: string]: {
    id?: string
    status: ExecutionStatus
    completedSteps: number[]
    failedSteps: Array<{
      step_number: number
      failure_reason: string
    }>
    notes?: string
    failure_reason?: string
    started_at?: string
    completed_at?: string
    duration_minutes?: number
    test_environment?: string
    browser?: string
    os_version?: string
  }
}

interface TestStep {
  step_number: number
  action: string
  expected: string
}

interface TestCaseForm {
  title: string
  description: string
  test_type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  preconditions: string
  test_steps: TestStep[]
  expected_result: string
  status: 'draft' | 'active' | 'archived'
}

interface ExecutionDetails {
  notes?: string
  failure_reason?: string
  environment?: string
  browser?: string
  os_version?: string
}

interface TestSession {
  id: string
  name: string
  status: string
  environment: string
  actual_start?: string
}

const platformIcons = {
  web: Monitor,
  mobile: Smartphone,
  api: Globe,
  accessibility: Eye,
  performance: Zap
}

const testTypes = [
  'functional', 'integration', 'unit', 'e2e', 'security', 'performance', 
  'accessibility', 'api', 'regression', 'smoke', 'user acceptance'
]

export function TabbedTestCaseTable() {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [crossPlatformCases, setCrossPlatformCases] = useState<CrossPlatformTestCase[]>([])
  const [generations, setGenerations] = useState<Record<string, Generation>>({})
  const [crossPlatformSuites, setCrossPlatformSuites] = useState<Record<string, CrossPlatformSuite>>({})
  const [loading, setLoading] = useState(true)
  const [execution, setExecution] = useState<TestExecution>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCase, setSelectedCase] = useState<TestCase | CrossPlatformTestCase | null>(null)
  const [selectedCaseType, setSelectedCaseType] = useState<'regular' | 'cross-platform'>('regular')
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [crossPlatformCurrentPage, setCrossPlatformCurrentPage] = useState(1)
  const [updating, setUpdating] = useState<string | null>(null)
  
  // CRUD state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExecutionDialog, setShowExecutionDialog] = useState(false)
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null)
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null)
  const [formData, setFormData] = useState<TestCaseForm>({
    title: '',
    description: '',
    test_type: 'functional',
    priority: 'medium',
    preconditions: '',
    test_steps: [{ step_number: 1, action: '', expected: '' }],
    expected_result: '',
    status: 'draft'
  })
  const [executionForm, setExecutionForm] = useState({
    notes: '',
    failure_reason: '',
    environment: 'staging',
    browser: '',
    os_version: ''
  })
  const [saving, setSaving] = useState(false)
  
  // Test session state
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null)
  
  const itemsPerPage = 10
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('generation')
  const sessionId = searchParams.get('session')

  useEffect(() => {
    fetchData()
    if (sessionId) {
      fetchTestSession()
    }
  }, [generationId, sessionId])

  async function fetchTestSession() {
    if (!sessionId) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('test_run_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) throw error
      setCurrentSession(data)
    } catch (error) {
      console.error('Error fetching test session:', error)
    }
  }

  async function fetchData() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to view test cases')
        return
      }
      
      // Fetch regular test cases
      let testCaseQuery = supabase
        .from('test_cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (generationId) {
        testCaseQuery = testCaseQuery.eq('generation_id', generationId)
      }

      const { data: testCasesData, error: testCasesError } = await testCaseQuery

      if (testCasesError) throw testCasesError
      setTestCases(testCasesData || [])
      
      // Fetch cross-platform test cases
      const { data: crossPlatformData, error: crossPlatformError } = await supabase
        .from('platform_test_cases')
        .select(`
          *,
          cross_platform_test_suites!inner(
            id,
            requirement,
            user_id,
            platforms,
            generated_at
          )
        `)
        .eq('cross_platform_test_suites.user_id', user.id)
        .order('created_at', { ascending: false })

      if (crossPlatformError) throw crossPlatformError
      setCrossPlatformCases(crossPlatformData || [])
      
      // Fetch generations
      const { data: generationsData, error: generationsError } = await supabase
        .from('test_case_generations')
        .select('id, title')
        .eq('user_id', user.id)

      if (generationsError) throw generationsError

      const generationsMap: Record<string, Generation> = {}
      generationsData?.forEach(gen => {
        generationsMap[gen.id] = gen
      })
      setGenerations(generationsMap)
      
      // Fetch cross-platform suites
      const { data: suitesData, error: suitesError } = await supabase
        .from('cross_platform_test_suites')
        .select('*')
        .eq('user_id', user.id)

      if (suitesError) throw suitesError

      const suitesMap: Record<string, CrossPlatformSuite> = {}
      suitesData?.forEach(suite => {
        suitesMap[suite.id] = suite
      })
      setCrossPlatformSuites(suitesMap)
      
      // Fetch existing executions
      await fetchExecutions(testCasesData?.map(tc => tc.id) || [], crossPlatformData?.map(cp => cp.id) || [])
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load test cases')
    } finally {
      setLoading(false)
    }
  }

  async function fetchExecutions(testCaseIds: string[], crossPlatformIds: string[]) {
    if (testCaseIds.length === 0 && crossPlatformIds.length === 0) return

    try {
      const supabase = createClient()
      const allIds = [...testCaseIds, ...crossPlatformIds]

      let query = supabase
        .from('test_executions')
        .select('*')
        .in('test_case_id', allIds)
        .order('created_at', { ascending: false })

      // If we're in a session, get executions for that session
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data, error } = await query

      if (error) throw error

      // Group executions by test case (get latest execution per test case)
      const executionMap: TestExecution = {}
      
      data?.forEach(execution => {
        if (!executionMap[execution.test_case_id]) {
          executionMap[execution.test_case_id] = {
            id: execution.id,
            status: execution.execution_status,
            completedSteps: execution.completed_steps || [],
            failedSteps: execution.failed_steps || [],
            notes: execution.execution_notes,
            failure_reason: execution.failure_reason,
            started_at: execution.started_at,
            completed_at: execution.completed_at,
            duration_minutes: execution.duration_minutes,
            test_environment: execution.test_environment,
            browser: execution.browser,
            os_version: execution.os_version
          }
        }
      })

      // Initialize executions for test cases without executions
      ;[...testCaseIds, ...crossPlatformIds].forEach(testCaseId => {
        if (!executionMap[testCaseId]) {
          executionMap[testCaseId] = {
            status: 'not_run',
            completedSteps: [],
            failedSteps: []
          }
        }
      })

      setExecution(executionMap)
    } catch (error) {
      console.error('Error fetching executions:', error)
    }
  }

  // Enhanced execution management functions
  async function saveExecutionProgress(testCaseId: string, updates: Partial<TestExecution[string]>) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const currentExecution = execution[testCaseId]
      const executionData = {
        test_case_id: testCaseId,
        executed_by: user.id,
        session_id: sessionId || null,
        execution_status: updates.status || currentExecution.status,
        completed_steps: updates.completedSteps || currentExecution.completedSteps,
        failed_steps: updates.failedSteps || currentExecution.failedSteps,
        execution_notes: updates.notes || currentExecution.notes,
        failure_reason: updates.failure_reason || currentExecution.failure_reason,
        test_environment: updates.test_environment || currentExecution.test_environment || 'staging',
        browser: updates.browser || currentExecution.browser,
        os_version: updates.os_version || currentExecution.os_version,
        started_at: currentExecution.started_at || (updates.status === 'in_progress' ? new Date().toISOString() : null),
        completed_at: (updates.status === 'passed' || updates.status === 'failed') ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      if (currentExecution.id) {
        // Update existing execution
        const { error } = await supabase
          .from('test_executions')
          .update(executionData)
          .eq('id', currentExecution.id)

        if (error) throw error
      } else {
        // Create new execution
        const { data, error } = await supabase
          .from('test_executions')
          .insert(executionData)
          .select()
          .single()

        if (error) throw error

        // Update local state with new execution ID
        setExecution(prev => ({
          ...prev,
          [testCaseId]: {
            ...prev[testCaseId],
            id: data.id
          }
        }))
      }
    } catch (error) {
      console.error('Error saving execution progress:', error)
      toast.error('Failed to save progress')
    }
  }

  function toggleStep(testCaseId: string, stepNumber: number) {
    const currentExecution = execution[testCaseId]
    const isCompleted = currentExecution.completedSteps.includes(stepNumber)
    
    const updatedSteps = isCompleted
      ? currentExecution.completedSteps.filter(s => s !== stepNumber)
      : [...currentExecution.completedSteps, stepNumber]
    
    // Update local state immediately
    setExecution(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        completedSteps: updatedSteps,
        status: prev[testCaseId].status === 'not_run' ? 'in_progress' : prev[testCaseId].status
      }
    }))

    // Save to database
    saveExecutionProgress(testCaseId, { 
      completedSteps: updatedSteps,
      status: currentExecution.status === 'not_run' ? 'in_progress' : currentExecution.status
    })
  }

  async function markTestResult(testCaseId: string, status: ExecutionStatus) {
    setSelectedTestCase(testCases.find(tc => tc.id === testCaseId) || null)
    setExecutionForm({
      notes: execution[testCaseId]?.notes || '',
      failure_reason: execution[testCaseId]?.failure_reason || '',
      environment: execution[testCaseId]?.test_environment || 'staging',
      browser: execution[testCaseId]?.browser || '',
      os_version: execution[testCaseId]?.os_version || ''
    })
    
    // If just marking as passed with no issues, save directly
    if (status === 'passed') {
      await saveExecutionResult(testCaseId, status, {})
    } else {
      setShowExecutionDialog(true)
    }
  }

async function updateTestCaseStatus(testCaseId: string, newStatus: 'draft' | 'active' | 'archived') {
  setUpdating(testCaseId)
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('test_cases')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', testCaseId)
      .select()
      .single()

    if (error) throw error

    // Update local state
    setTestCases(prev => prev.map(tc => 
      tc.id === testCaseId ? { ...tc, status: newStatus } : tc
    ))

    const statusLabels = {
      draft: 'Draft',
      active: 'Approved',
      archived: 'Archived'
    }

    toast.success(`Status updated to ${statusLabels[newStatus]}`)
  } catch (error) {
    console.error('Error updating test case status:', error)
    toast.error('Failed to update status')
  } finally {
    setUpdating(null)
  }
}


  async function saveExecutionResult(testCaseId: string, status: ExecutionStatus, details: ExecutionDetails) {
    const startTime = execution[testCaseId]?.started_at
    const duration = startTime 
      ? Math.round((new Date().getTime() - new Date(startTime).getTime()) / 60000)
      : undefined

    await saveExecutionProgress(testCaseId, {
      status: status,
      duration_minutes: duration,
      notes: details.notes,
      failure_reason: details.failure_reason,
      test_environment: details.environment,
      browser: details.browser,
      os_version: details.os_version
    })

    setExecution(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: status,
        completed_at: new Date().toISOString(),
        duration_minutes: duration
      }
    }))

    const statusMessages = {
      passed: 'Test marked as passed',
      failed: 'Test marked as failed', 
      blocked: 'Test marked as blocked',
      skipped: 'Test marked as skipped',
      not_run: 'Test marked as not run',
      in_progress: 'Test marked as not run',

    } as const

    toast.success(statusMessages[status] || 'Test status updated')
    setShowExecutionDialog(false)
  }

  async function resetTest(testCaseId: string) {
    await saveExecutionProgress(testCaseId, {
      status: 'not_run',
      completedSteps: [],
      failedSteps: [],
      notes: '',
      failure_reason: '',
      started_at: undefined,
      completed_at: undefined
    })

    setExecution(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        status: 'not_run',
        completedSteps: [],
        failedSteps: [],
        started_at: undefined,
        completed_at: undefined
      }
    }))

    toast.success('Test reset')
  }

  // Legacy functions for backward compatibility
  async function markAsPassed(testCaseId: string, isRegular: boolean) {
    await markTestResult(testCaseId, 'passed')
  }

  async function markAsFailed(testCaseId: string, isRegular: boolean) {
    await markTestResult(testCaseId, 'failed')
  }

  // CRUD Functions (existing)
  async function handleCreateTestCase() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please log in to create test cases')
        return
      }

      const { data, error } = await supabase
        .from('test_cases')
        .insert({
          user_id: user.id,
          generation_id: generationId || null,
          title: formData.title,
          description: formData.description,
          test_type: formData.test_type,
          priority: formData.priority,
          preconditions: formData.preconditions || null,
          test_steps: formData.test_steps,
          expected_result: formData.expected_result,
          is_edge_case: false,
          status: formData.status,
          execution_status: 'not_run',
          is_manual: true
        })
        .select()
        .single()

      if (error) throw error

      setTestCases(prev => [data, ...prev])
      
      // Initialize execution state for new test case
      setExecution(prev => ({
        ...prev,
        [data.id]: {
          status: 'not_run',
          completedSteps: [],
          failedSteps: []
        }
      }))

      setShowCreateDialog(false)
      resetForm()
      toast.success('Test case created successfully')
    } catch (error) {
      console.error('Error creating test case:', error)
      toast.error('Failed to create test case')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateTestCase() {
    if (!editingTestCase) return
    
    setSaving(true)
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('test_cases')
        .update({
          title: formData.title,
          description: formData.description,
          test_type: formData.test_type,
          priority: formData.priority,
          preconditions: formData.preconditions || null,
          test_steps: formData.test_steps,
          expected_result: formData.expected_result,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTestCase.id)
        .select()
        .single()

      if (error) throw error

      setTestCases(prev => prev.map(tc => tc.id === editingTestCase.id ? data : tc))
      setShowEditDialog(false)
      setEditingTestCase(null)
      resetForm()
      toast.success('Test case updated successfully')
    } catch (error) {
      console.error('Error updating test case:', error)
      toast.error('Failed to update test case')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTestCase() {
  if (!deletingTestCase) return
  
  setSaving(true)
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('You must be logged in to delete test cases')
      return
    }

    // STEP 1: Delete test_executions first (foreign key constraint)
    const { error: executionsError } = await supabase
      .from('test_executions')
      .delete()
      .eq('test_case_id', deletingTestCase.id)

    if (executionsError) {
      console.error('Error deleting test executions:', executionsError)
      throw new Error('Failed to delete test executions')
    }

    // STEP 2: Delete test_suite_cases associations
    const { error: suiteRelationsError } = await supabase
      .from('test_suite_cases')
      .delete()
      .eq('test_case_id', deletingTestCase.id)

    if (suiteRelationsError) {
      console.error('Error deleting suite associations:', suiteRelationsError)
      throw new Error('Failed to delete suite associations')
    }

    // STEP 3: Now delete the test case itself
    const { error } = await supabase
      .from('test_cases')
      .delete()
      .eq('id', deletingTestCase.id)
      .eq('user_id', user.id) // Security: Ensure user owns this test case

    if (error) {
      console.error('Error deleting test case:', error)
      throw error
    }

    // STEP 4: Update local state
    setTestCases(prev => prev.filter(tc => tc.id !== deletingTestCase.id))
    
    // Remove from execution state
    setExecution(prev => {
      const newExecution = { ...prev }
      delete newExecution[deletingTestCase.id]
      return newExecution
    })

    setShowDeleteDialog(false)
    setDeletingTestCase(null)
    toast.success('Test case deleted successfully')
  } catch (error) {
    console.error('Error deleting test case:', error)
    toast.error('Failed to delete test case')
  } finally {
    setSaving(false)
  }
}


  function openCreateDialog() {
    resetForm()
    setShowCreateDialog(true)
  }

  function openEditDialog(testCase: TestCase) {
    setEditingTestCase(testCase)
    setFormData({
      title: testCase.title,
      description: testCase.description,
      test_type: testCase.test_type,
      priority: testCase.priority,
      preconditions: testCase.preconditions || '',
      test_steps: testCase.test_steps,
      expected_result: testCase.expected_result,
      status: testCase.status
    })
    setShowEditDialog(true)
  }

  function openDeleteDialog(testCase: TestCase) {
    setDeletingTestCase(testCase)
    setShowDeleteDialog(true)
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      test_type: 'functional',
      priority: 'medium',
      preconditions: '',
      test_steps: [{ step_number: 1, action: '', expected: '' }],
      expected_result: '',
      status: 'draft'
    })
  }

  function addTestStep() {
    setFormData(prev => ({
      ...prev,
      test_steps: [
        ...prev.test_steps,
        {
          step_number: prev.test_steps.length + 1,
          action: '',
          expected: ''
        }
      ]
    }))
  }

  function removeTestStep(index: number) {
    setFormData(prev => ({
      ...prev,
      test_steps: prev.test_steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step_number: i + 1 }))
    }))
  }

  function updateTestStep(index: number, field: 'action' | 'expected', value: string) {
    setFormData(prev => ({
      ...prev,
      test_steps: prev.test_steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }))
  }

  function openTestCaseDialog(testCase: TestCase | CrossPlatformTestCase, type: 'regular' | 'cross-platform') {
    setSelectedCase(testCase)
    setSelectedCaseType(type)
    setShowDetailsDialog(true)
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
      active: { variant: 'default', label: 'Approved' },
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

  // Filter test cases
  const filteredTestCases = testCases.filter(tc =>
    tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCrossPlatformCases = crossPlatformCases.filter(tc =>
    tc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tc.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const totalPages = Math.ceil(filteredTestCases.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex)

  const crossPlatformTotalPages = Math.ceil(filteredCrossPlatformCases.length / itemsPerPage)
  const crossPlatformStartIndex = (crossPlatformCurrentPage - 1) * itemsPerPage
  const crossPlatformEndIndex = crossPlatformStartIndex + itemsPerPage
  const paginatedCrossPlatformCases = filteredCrossPlatformCases.slice(crossPlatformStartIndex, crossPlatformEndIndex)

  // Enhanced stats with new execution statuses
  const regularStats = {
    total: filteredTestCases.length,
    passed: filteredTestCases.filter(tc => execution[tc.id]?.status === 'passed').length,
    failed: filteredTestCases.filter(tc => execution[tc.id]?.status === 'failed').length,
    blocked: filteredTestCases.filter(tc => execution[tc.id]?.status === 'blocked').length,
    skipped: filteredTestCases.filter(tc => execution[tc.id]?.status === 'skipped').length,
    inProgress: filteredTestCases.filter(tc => execution[tc.id]?.status === 'in_progress').length,
    notRun: filteredTestCases.filter(tc => execution[tc.id]?.status === 'not_run').length
  }

  const crossPlatformStats = {
    total: filteredCrossPlatformCases.length,
    passed: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'passed').length,
    failed: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'failed').length,
    blocked: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'blocked').length,
    skipped: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'skipped').length,
    inProgress: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'in_progress').length,
    notRun: filteredCrossPlatformCases.filter(tc => execution[tc.id]?.status === 'not_run').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Helper function to render test steps for both types
  const renderTestSteps = (testCase: TestCase | CrossPlatformTestCase, type: 'regular' | 'cross-platform') => {
    if (type === 'regular') {
      const regularCase = testCase as TestCase
      return regularCase.test_steps.map((step) => {
        const isCompleted = execution[testCase.id]?.completedSteps.includes(step.step_number)
        const failedStep = execution[testCase.id]?.failedSteps.find(fs => fs.step_number === step.step_number)
        
        return (
          <div 
            key={step.step_number}
            className={`flex gap-3 p-3 rounded-lg border ${
              failedStep ? 'bg-red-50 border-red-200' : 'bg-card'
            }`}
          >
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => toggleStep(testCase.id, step.step_number)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  Step {step.step_number}
                </span>
                <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                  {step.action}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-16">
                <span className="font-semibold">Expected:</span> {step.expected}
              </div>
              {failedStep && (
                <div className="text-sm text-red-600 pl-16 bg-red-100 p-2 rounded mt-2">
                  <span className="font-semibold">Failed:</span> {failedStep.failure_reason}
                </div>
              )}
            </div>
          </div>
        )
      })
    } else {
      const crossPlatformCase = testCase as CrossPlatformTestCase
      return crossPlatformCase.steps?.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = execution[testCase.id]?.completedSteps.includes(stepNumber)
        return (
          <div 
            key={stepNumber}
            className="flex gap-3 p-3 rounded-lg border bg-card"
          >
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => toggleStep(testCase.id, stepNumber)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  Step {stepNumber}
                </span>
                <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
                  {step}
                </span>
              </div>
              <div className="text-sm text-muted-foreground pl-16">
                <span className="font-semibold">Expected:</span> {crossPlatformCase.expected_results?.[index] || 'Expected result defined'}
              </div>
            </div>
          </div>
        )
      }) || []
    }
  }

  return (
    <div className="space-y-6">
      {/* Session Info */}
      {currentSession && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">{currentSession.name}</h3>
              <p className="text-blue-700 text-sm">Test Session • Environment: {currentSession.environment}</p>
            </div>
            <Badge variant={currentSession.status === 'in_progress' ? 'default' : 'secondary'}>
              {currentSession.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
              {currentSession.status}
            </Badge>
          </div>
        </div>
      )}

      {/* Header with Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
              setCrossPlatformCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Test Case
        </Button>
        <Button variant="outline" size="default">
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Regular Tests ({regularStats.total})
          </TabsTrigger>
          <TabsTrigger value="cross-platform" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Cross-Platform ({crossPlatformStats.total})
          </TabsTrigger>
        </TabsList>

        {/* Regular Test Cases Tab */}
        <TabsContent value="regular" className="space-y-6">
          {/* Enhanced Test Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold">{regularStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{regularStats.passed}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{regularStats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{regularStats.blocked}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{regularStats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-500">{regularStats.notRun}</div>
              <div className="text-sm text-muted-foreground">Not Run</div>
            </div>
          </div>

          {/* Enhanced Test Cases Table with execution status icons */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[150px]">Generation</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTestCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <FlaskConical className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No regular test cases found</p>
                        <Button onClick={openCreateDialog} variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Create your first test case
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTestCases.map((testCase) => {
                    const exec = execution[testCase.id]
                    const generation = generations[testCase.generation_id]
                    
                    return (
                      <TableRow key={testCase.id}>
                        <TableCell className="font-medium">
                          <div 
                            className="flex items-center gap-2 cursor-pointer hover:text-primary"
                            onClick={() => openTestCaseDialog(testCase, 'regular')}
                          >
                            {exec?.status === 'passed' && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {exec?.status === 'failed' && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {exec?.status === 'blocked' && (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                            {exec?.status === 'skipped' && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            {exec?.status === 'in_progress' && (
                              <Clock className="h-4 w-4 text-blue-600" />
                            )}
                            {exec?.status === 'not_run' && (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                            <span>{testCase.title}</span>
                            {exec?.duration_minutes && (
                              <span className="text-xs text-muted-foreground">
                                ({exec.duration_minutes}m)
                              </span>
                            )}
                          </div>
                        </TableCell>
                       <TableCell>
  {/* STATUS DROPDOWN */}
  <Select
    value={testCase.status}
    onValueChange={(value: 'draft' | 'active' | 'archived') => 
      updateTestCaseStatus(testCase.id, value)
    }
    disabled={updating === testCase.id}
  >
    <SelectTrigger className="w-[120px] h-8">
      {updating === testCase.id ? (
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
      ) : null}
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="draft">Draft</SelectItem>
      <SelectItem value="active">Approved</SelectItem>
      <SelectItem value="archived">Archived</SelectItem>
    </SelectContent>
  </Select>
</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(testCase.priority)}>
                            {testCase.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{testCase.test_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {generation?.title || 'Manual'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {getRelativeTime(testCase.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openTestCaseDialog(testCase, 'regular')}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(testCase)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(testCase)}
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
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTestCases.length)} of {filteredTestCases.length} regular test cases
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
        </TabsContent>

        {/* Cross-Platform Test Cases Tab (simplified for space) */}
        <TabsContent value="cross-platform" className="space-y-6">
          {/* Cross-Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold">{crossPlatformStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{crossPlatformStats.passed}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{crossPlatformStats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{crossPlatformStats.blocked}</div>
              <div className="text-sm text-muted-foreground">Blocked</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{crossPlatformStats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="bg-card p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-500">{crossPlatformStats.notRun}</div>
              <div className="text-sm text-muted-foreground">Not Run</div>
            </div>
          </div>

          {/* Cross-Platform Table (existing) - keeping it simple for now */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[100px]">Platform</TableHead>
                  <TableHead className="w-[100px]">Framework</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[150px]">Requirement</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCrossPlatformCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Layers className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No cross-platform test cases found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCrossPlatformCases.map((testCase) => {
                    const exec = execution[testCase.id]
                    const suite = crossPlatformSuites[testCase.suite_id]
                    const Icon = platformIcons[testCase.platform as keyof typeof platformIcons]
                    
                    return (
                      <TableRow 
                        key={testCase.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openTestCaseDialog(testCase, 'cross-platform')}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {exec?.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {exec?.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                            {exec?.status === 'blocked' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                            {exec?.status === 'skipped' && <Circle className="h-4 w-4 text-gray-400" />}
                            {exec?.status === 'in_progress' && <Clock className="h-4 w-4 text-blue-600" />}
                            {exec?.status === 'not_run' && <Circle className="h-4 w-4 text-gray-400" />}
                            <span>{testCase.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            <Badge variant="default">{testCase.platform}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{testCase.framework}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(testCase.priority)}>
                            {testCase.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {suite?.requirement || testCase.cross_platform_test_suites?.requirement || 'N/A'}
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

          {/* Cross-Platform Pagination */}
          {crossPlatformTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {crossPlatformStartIndex + 1}-{Math.min(crossPlatformEndIndex, filteredCrossPlatformCases.length)} of {filteredCrossPlatformCases.length} cross-platform test cases
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrossPlatformCurrentPage(p => Math.max(1, p - 1))}
                  disabled={crossPlatformCurrentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrossPlatformCurrentPage(p => Math.min(crossPlatformTotalPages, p + 1))}
                  disabled={crossPlatformCurrentPage === crossPlatformTotalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Test Case Dialog */}
      <Dialog
        open={showCreateDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setShowEditDialog(false)
            setEditingTestCase(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
            <DialogTitle className="flex items-center gap-3">
              {showCreateDialog ? "Create New Test Case" : "Edit Test Case"}
            </DialogTitle>
            <DialogDescription>
              {showCreateDialog
                ? "Fill in the details below to create a new test case."
                : "Update the test case details below."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter test case title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test_type">Test Type</Label>
                <Select
                  value={formData.test_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, test_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                    setFormData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'active' | 'archived') => 
                    setFormData(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this test case covers"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preconditions">Preconditions</Label>
              <Textarea
                id="preconditions"
                value={formData.preconditions}
                onChange={(e) => setFormData(prev => ({ ...prev, preconditions: e.target.value }))}
                placeholder="Any prerequisites or setup required before running this test"
                rows={2}
              />
            </div>

            {/* Test Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Test Steps *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTestStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
              
              <div className="space-y-3">
                {formData.test_steps.map((step, index) => (
                  <div key={step.step_number} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Step {step.step_number}</span>
                      {formData.test_steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestStep(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`action-${index}`}>Action</Label>
                      <Input
                        id={`action-${index}`}
                        value={step.action}
                        onChange={(e) => updateTestStep(index, 'action', e.target.value)}
                        placeholder="What action should be performed?"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`expected-${index}`}>Expected Result</Label>
                      <Input
                        id={`expected-${index}`}
                        value={step.expected}
                        onChange={(e) => updateTestStep(index, 'expected', e.target.value)}
                        placeholder="What should happen after performing the action?"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_result">Overall Expected Result *</Label>
              <Textarea
                id="expected_result"
                value={formData.expected_result}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_result: e.target.value }))}
                placeholder="What should be the final outcome of this test case?"
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                setEditingTestCase(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={showCreateDialog ? handleCreateTestCase : handleUpdateTestCase}
              disabled={saving || !formData.title || !formData.description || !formData.expected_result}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {showCreateDialog ? "Create Test Case" : "Update Test Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Execution Details Dialog */}
      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Test Execution Details</DialogTitle>
            <DialogDescription>
              Provide additional details about the test execution result.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Test Environment</Label>
              <Select
                value={executionForm.environment}
                onValueChange={(value) => setExecutionForm(prev => ({ ...prev, environment: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="browser">Browser</Label>
                <Input
                  id="browser"
                  value={executionForm.browser}
                  onChange={(e) => setExecutionForm(prev => ({ ...prev, browser: e.target.value }))}
                  placeholder="e.g., Chrome 119"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="os">OS Version</Label>
                <Input
                  id="os"
                  value={executionForm.os_version}
                  onChange={(e) => setExecutionForm(prev => ({ ...prev, os_version: e.target.value }))}
                  placeholder="e.g., Windows 11"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Execution Notes</Label>
              <Textarea
                id="notes"
                value={executionForm.notes}
                onChange={(e) => setExecutionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the test execution..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="failure_reason">Failure Reason</Label>
              <Textarea
                id="failure_reason"
                value={executionForm.failure_reason}
                onChange={(e) => setExecutionForm(prev => ({ ...prev, failure_reason: e.target.value }))}
                placeholder="Describe what went wrong..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecutionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedTestCase) {
                  saveExecutionResult(selectedTestCase.id, 'failed', executionForm)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingTestCase?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTestCase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Test Case Details Dialog */}
      {selectedCase && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="sticky top-0 z-10 bg-background p-6 border-b">
              <DialogTitle className="flex items-center gap-3">
                {execution[selectedCase.id]?.status === 'passed' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {execution[selectedCase.id]?.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                {execution[selectedCase.id]?.status === 'blocked' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                {execution[selectedCase.id]?.status === 'skipped' && <Circle className="h-5 w-5 text-gray-400" />}
                {execution[selectedCase.id]?.status === 'in_progress' && <Clock className="h-5 w-5 text-blue-600" />}
                {execution[selectedCase.id]?.status === 'not_run' && <Circle className="h-5 w-5 text-gray-400" />}
                {selectedCase.title}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap pt-2">
                <Badge className={getPriorityColor(selectedCase.priority)}>
                  {selectedCase.priority}
                </Badge>
                {selectedCaseType === 'regular' ? (
                  <Badge variant="secondary">{(selectedCase as TestCase).test_type}</Badge>
                ) : (
                  <Badge variant="default">{(selectedCase as CrossPlatformTestCase).platform}</Badge>
                )}
                <span className="text-xs">
                  {execution[selectedCase.id]?.completedSteps.length || 0}/{
                    selectedCaseType === 'regular' 
                      ? (selectedCase as TestCase).test_steps.length 
                      : (selectedCase as CrossPlatformTestCase).steps?.length || 0
                  } steps
                </span>
                {execution[selectedCase.id]?.duration_minutes && (
                  <span className="text-xs">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {execution[selectedCase.id].duration_minutes}m
                  </span>
                )}
                {selectedCaseType === 'regular' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(selectedCase as TestCase)}
                    className="ml-auto"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
                </div>

                {/* Execution Notes */}
                {execution[selectedCase.id]?.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Execution Notes</h4>
                    <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                      {execution[selectedCase.id].notes}
                    </p>
                  </div>
                )}

                {execution[selectedCase.id]?.failure_reason && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Failure Reason</h4>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {execution[selectedCase.id].failure_reason}
                    </p>
                  </div>
                )}

                {/* Preconditions */}
                {selectedCase.preconditions && (
                  <div>
                    <h4 className="font-semibold mb-2">Preconditions</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCaseType === 'regular' 
                        ? selectedCase.preconditions as string
                        : (selectedCase as CrossPlatformTestCase).preconditions.join(', ')
                      }
                    </p>
                  </div>
                )}

                {/* Test Steps */}
                <div>
                  <h4 className="font-semibold mb-3">Test Steps</h4>
                  <div className="space-y-3">
                    {renderTestSteps(selectedCase, selectedCaseType)}
                  </div>
                </div>

                {/* Expected Result */}
                <div>
                  <h4 className="font-semibold mb-2">Expected Result</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    {selectedCaseType === 'regular'
                      ? (selectedCase as TestCase).expected_result
                      : (selectedCase as CrossPlatformTestCase).expected_results?.join('; ') || 'See individual step expectations'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Actions - Fixed at bottom */}
            <div className="px-6 py-4 border-t grid grid-cols-2 md:grid-cols-5 gap-2 flex-shrink-0">
              <Button
                onClick={() => markTestResult(selectedCase.id, 'passed')}
                disabled={execution[selectedCase.id]?.status === 'passed' || updating === selectedCase.id}
                variant={execution[selectedCase.id]?.status === 'passed' ? 'default' : 'outline'}
                size="sm"
              >
                {updating === selectedCase.id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                )}
                Pass
              </Button>
              <Button
                onClick={() => markTestResult(selectedCase.id, 'failed')}
                disabled={execution[selectedCase.id]?.status === 'failed' || updating === selectedCase.id}
                variant={execution[selectedCase.id]?.status === 'failed' ? 'destructive' : 'outline'}
                size="sm"
              >
                {updating === selectedCase.id ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Fail
              </Button>
              <Button
                onClick={() => markTestResult(selectedCase.id, 'blocked')}
                disabled={execution[selectedCase.id]?.status === 'blocked' || updating === selectedCase.id}
                variant={execution[selectedCase.id]?.status === 'blocked' ? 'secondary' : 'outline'}
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Block
              </Button>
              <Button
                onClick={() => markTestResult(selectedCase.id, 'skipped')}
                disabled={execution[selectedCase.id]?.status === 'skipped' || updating === selectedCase.id}
                variant="outline"
                size="sm"
              >
                <Circle className="h-4 w-4 mr-1" />
                Skip
              </Button>
              <Button
                onClick={() => resetTest(selectedCase.id)}
                variant="ghost"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}