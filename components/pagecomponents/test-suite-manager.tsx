// components/test-management/TestSuiteManager.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Plus, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Users,
  Calendar,
  BarChart3,
  Settings
} from "lucide-react"

interface TestSuite {
  id: string
  name: string
  description?: string
  suite_type: 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'
  status: 'draft' | 'active' | 'completed' | 'archived'
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  created_at: string
  test_case_count?: number
  execution_stats?: {
    total: number
    passed: number
    failed: number
    skipped: number
    blocked: number
  }
}

interface TestSuiteCase {
  id: string
  test_case_id: string
  sequence_order: number
  assigned_to?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimated_duration_minutes: number
  test_cases?: {
    title: string
    description: string
    test_type: string
    execution_status: string
  }
}

type SuiteType = 'manual' | 'automated' | 'regression' | 'smoke' | 'integration'

interface FormData {
  name: string
  description: string
  suite_type: SuiteType
  planned_start_date: string
  planned_end_date: string
}

export function TestSuiteManager() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    suite_type: 'manual',
    planned_start_date: '',
    planned_end_date: ''
  })

  useEffect(() => {
    fetchTestSuites()
  }, [])

  async function fetchTestSuites() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('test_suites')
        .select(`
          *,
          test_suite_cases!inner(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Get execution stats for each suite
      const suitesWithStats = await Promise.all(
        data.map(async (suite) => {
          const { data: executions } = await supabase
            .from('test_executions')
            .select('execution_status')
            .eq('suite_id', suite.id)

          const stats = executions?.reduce((acc, exec) => {
            acc.total++
            if (exec.execution_status === 'pass') acc.passed++
            else if (exec.execution_status === 'fail') acc.failed++
            else if (exec.execution_status === 'skip') acc.skipped++
            else if (exec.execution_status === 'blocked') acc.blocked++
            return acc
          }, { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 })

          return {
            ...suite,
            execution_stats: stats
          }
        })
      )

      setTestSuites(suitesWithStats)
    } catch (error) {
      console.error('Error fetching test suites:', error)
      toast.error('Failed to load test suites')
    } finally {
      setLoading(false)
    }
  }

  async function createTestSuite() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('test_suites')
        .insert({
          user_id: user.id,
          ...formData,
          planned_start_date: formData.planned_start_date || null,
          planned_end_date: formData.planned_end_date || null
        })
        .select()
        .single()

      if (error) throw error

      setTestSuites(prev => [data, ...prev])
      setShowCreateDialog(false)
      resetForm()
      toast.success('Test suite created successfully')
    } catch (error) {
      console.error('Error creating test suite:', error)
      toast.error('Failed to create test suite')
    }
  }

  async function startTestSuite(suiteId: string) {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('test_suites')
        .update({ 
          status: 'active',
          actual_start_date: new Date().toISOString()
        })
        .eq('id', suiteId)

      if (error) throw error

      toast.success('Test suite started')
      fetchTestSuites()
    } catch (error) {
      console.error('Error starting test suite:', error)
      toast.error('Failed to start test suite')
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      suite_type: 'manual',
      planned_start_date: '',
      planned_end_date: ''
    })
  }

  function getSuiteTypeColor(type: string) {
    switch (type) {
      case 'regression': return 'bg-blue-500 text-white'
      case 'smoke': return 'bg-green-500 text-white' 
      case 'integration': return 'bg-purple-500 text-white'
      case 'automated': return 'bg-orange-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'completed': return <Badge variant="secondary">Completed</Badge>
      case 'archived': return <Badge variant="outline">Archived</Badge>
      default: return <Badge variant="outline">Draft</Badge>
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading test suites...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Test Suite
        </Button>
      </div>

      {/* Test Suites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testSuites.map((suite) => (
          <div key={suite.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{suite.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {suite.description || 'No description'}
                </p>
              </div>
              {getStatusBadge(suite.status)}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getSuiteTypeColor(suite.suite_type)}>
                  {suite.suite_type}
                </Badge>
                {suite.test_case_count && (
                  <span className="text-sm text-muted-foreground">
                    {suite.test_case_count} test cases
                  </span>
                )}
              </div>

              {suite.execution_stats && suite.execution_stats.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round((suite.execution_stats.passed / suite.execution_stats.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${(suite.execution_stats.passed / suite.execution_stats.total) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✓ {suite.execution_stats.passed}</span>
                    <span>✗ {suite.execution_stats.failed}</span>
                    <span>⏸ {suite.execution_stats.skipped}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {suite.status === 'draft' && (
                  <Button 
                    size="sm" 
                    onClick={() => startTestSuite(suite.id)}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedSuite(suite)
                    setShowDetailsDialog(true)
                  }}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {testSuites.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No test suites yet</h3>
          <p className="text-muted-foreground mb-4">Create your first test suite to organize test execution</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Test Suite
          </Button>
        </div>
      )}

      {/* Create Test Suite Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Test Suite</DialogTitle>
            <DialogDescription>
              Organize test cases into executable suites for better test management.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Suite Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., User Authentication Tests"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this suite tests"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suite_type">Suite Type</Label>
              <Select
                value={formData.suite_type}
                onValueChange={(value: SuiteType) => 
                  setFormData(prev => ({ ...prev, suite_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Testing</SelectItem>
                  <SelectItem value="automated">Automated Testing</SelectItem>
                  <SelectItem value="regression">Regression Testing</SelectItem>
                  <SelectItem value="smoke">Smoke Testing</SelectItem>
                  <SelectItem value="integration">Integration Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Planned Start</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.planned_start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Planned End</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.planned_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, planned_end_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createTestSuite}
              disabled={!formData.name}
            >
              Create Suite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Suite Details Dialog will go here */}
      {/* TODO: Add TestSuiteDetails component */}
    </div>
  )
}