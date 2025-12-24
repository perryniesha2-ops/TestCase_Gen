"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Users,
  Calendar,
  Plus,
  ArrowUpRight,
  Activity
} from "lucide-react"
import Link from "next/link"

interface DashboardMetrics {
  test_cases: {
    total: number
    passed: number
    failed: number
    blocked: number
    skipped: number
    not_run: number
    pass_rate: number
  }
  requirements: {
    total: number
    tested: number
    coverage_percentage: number
    by_priority: Record<string, number>
  }
  test_suites: {
    total: number
    active: number
    completed: number
    draft: number
  }
  recent_activity: Array<{
    id: string
    type: 'execution' | 'suite_started' | 'requirement_linked'
    description: string
    timestamp: string
    status?: string
  }>
}

interface RecentTestCase {
  id: string
  title: string
  test_type: string
  execution_status: string
  updated_at: string
}

interface ActiveSuite {
  id: string
  name: string
  suite_type: string
  progress: number
  total_cases: number
  passed_cases: number
}

export function TestManagementDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    test_cases: {
      total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, not_run: 0, pass_rate: 0
    },
    requirements: {
      total: 0, tested: 0, coverage_percentage: 0, by_priority: {}
    },
    test_suites: {
      total: 0, active: 0, completed: 0, draft: 0
    },
    recent_activity: []
  })
  const [recentTestCases, setRecentTestCases] = useState<RecentTestCase[]>([])
  const [activeSuites, setActiveSuites] = useState<ActiveSuite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      await Promise.all([
        fetchTestCaseMetrics(),
        fetchRequirementsMetrics(),
        fetchTestSuiteMetrics(),
        fetchRecentTestCases(),
        fetchActiveSuites(),
        fetchRecentActivity()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTestCaseMetrics() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 1) Get test case ids for this user (active only if you want)
  const { data: testCases, error: tcErr } = await supabase
    .from("test_cases")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "archived")

  if (tcErr) throw tcErr
  if (!testCases || testCases.length === 0) {
    setMetrics(prev => ({
      ...prev,
      test_cases: { total: 0, passed: 0, failed: 0, blocked: 0, skipped: 0, not_run: 0, pass_rate: 0 }
    }))
    return
  }

  const testCaseIds = testCases.map(tc => tc.id)

  // 2) Get latest execution status for those test cases (1 row per test case that has executions)
  const { data: latestRows, error: leErr } = await supabase
    .from("v_test_case_latest_execution")
    .select("test_case_id, execution_status")
    .in("test_case_id", testCaseIds)

  if (leErr) throw leErr

  const latestMap = (latestRows || []).reduce((acc, row) => {
    acc[row.test_case_id] = row.execution_status
    return acc
  }, {} as Record<string, string>)

  // 3) Count statuses. Anything missing from latestMap is "not_run".
  const counts = {
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    not_run: 0,
  }

  for (const id of testCaseIds) {
    const status = latestMap[id] ?? "not_run"
    if (status === "passed") counts.passed++
    else if (status === "failed") counts.failed++
    else if (status === "blocked") counts.blocked++
    else if (status === "skipped") counts.skipped++
    else counts.not_run++
  }

  const total = testCaseIds.length
  const pass_rate = total > 0 ? Math.round((counts.passed / total) * 100) : 0

  setMetrics(prev => ({
    ...prev,
    test_cases: {
      total,
      passed: counts.passed,
      failed: counts.failed,
      blocked: counts.blocked,
      skipped: counts.skipped,
      not_run: counts.not_run,
      pass_rate,
    },
  }))
}

  async function fetchRequirementsMetrics() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: requirements } = await supabase
      .from('requirements')
      .select('id, priority')
      .eq('user_id', user.id)

    if (!requirements) return

    // Get requirements with linked test cases
    const { data: linkedRequirements } = await supabase
      .from('requirement_test_cases')
      .select('requirement_id')
      .in('requirement_id', requirements.map(r => r.id))

    const testedRequirements = new Set(linkedRequirements?.map(lr => lr.requirement_id) || [])
    
    const byPriority = requirements.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    setMetrics(prev => ({
      ...prev,
      requirements: {
        total: requirements.length,
        tested: testedRequirements.size,
        coverage_percentage: requirements.length > 0 
          ? Math.round((testedRequirements.size / requirements.length) * 100) 
          : 0,
        by_priority: byPriority
      }
    }))
  }

  async function fetchTestSuiteMetrics() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: suites } = await supabase
      .from('test_suites')
      .select('status')
      .eq('user_id', user.id)

    if (!suites) return

    const statusCounts = suites.reduce((acc, suite) => {
      acc[suite.status] = (acc[suite.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    setMetrics(prev => ({
      ...prev,
      test_suites: {
        total: suites.length,
        active: statusCounts.active || 0,
        completed: statusCounts.completed || 0,
        draft: statusCounts.draft || 0
      }
    }))
  }

  async function fetchRecentTestCases() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('test_cases')
      .select('id, title, test_type, execution_status, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5)

    setRecentTestCases(data || [])
  }

  async function fetchActiveSuites() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: suites } = await supabase
      .from('test_suites')
      .select('id, name, suite_type')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(3)

    if (!suites) return

    // Get execution stats for each active suite
    const suitesWithProgress = await Promise.all(
      suites.map(async (suite) => {
        const { data: executions } = await supabase
          .from('test_executions')
          .select('execution_status')
          .eq('suite_id', suite.id)

        const total = executions?.length || 0
        const passed = executions?.filter(e => e.execution_status === 'passed').length || 0

        return {
          ...suite,
          total_cases: total,
          passed_cases: passed,
          progress: total > 0 ? Math.round((passed / total) * 100) : 0
        }
      })
    )

    setActiveSuites(suitesWithProgress)
  }

 async function fetchRecentActivity() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data, error } = await supabase
    .from("test_executions")
    .select(`
      id,
      execution_status,
      created_at,
      test_case_id,
      test_cases ( title )
    `)
    .eq("executed_by", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) throw error

  const activity = (data || []).map((exec) => ({
    id: exec.id,
    type: "execution" as const,
    description: `Test "${(exec as any).test_cases?.title || "Unknown Test"}" ${exec.execution_status}`,
    timestamp: exec.created_at,
    status: exec.execution_status,
  }))

  setMetrics(prev => ({ ...prev, recent_activity: activity }))
}

  function getStatusIcon(status: string) {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'blocked': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'skipped': return <Clock className="h-4 w-4 text-gray-600" />
      default: return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  function getPassRateColor(rate: number) {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Test Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.test_cases.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.test_cases.not_run} not executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPassRateColor(metrics.test_cases.pass_rate)}`}>
              {metrics.test_cases.pass_rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.test_cases.passed} of {metrics.test_cases.total} tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requirements Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.requirements.coverage_percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.requirements.tested} of {metrics.requirements.total} requirements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suites</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.test_suites.active}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.test_suites.total} total suites
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Execution Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Test Execution Status
              <Link href="/pages/test-cases">
                <Button variant="outline" size="sm">
                  View All <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>Current status of all test cases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.test_cases.passed}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${metrics.test_cases.total > 0 ? 
                          (metrics.test_cases.passed / metrics.test_cases.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.test_cases.failed}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ 
                        width: `${metrics.test_cases.total > 0 ? 
                          (metrics.test_cases.failed / metrics.test_cases.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span>Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.test_cases.blocked}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ 
                        width: `${metrics.test_cases.total > 0 ? 
                          (metrics.test_cases.blocked / metrics.test_cases.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span>Not Run</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{metrics.test_cases.not_run}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ 
                        width: `${metrics.test_cases.total > 0 ? 
                          (metrics.test_cases.not_run / metrics.test_cases.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements by Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements by Priority</CardTitle>
            <CardDescription>Distribution of requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.requirements.by_priority).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={`capitalize ${
                      priority === 'critical' ? 'text-red-600' : 
                      priority === 'high' ? 'text-orange-600' : 
                      priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`}
                  >
                    {priority}
                  </Badge>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Test Suites */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Active Test Suites
              <Link href="/pages/test-library">
                <Button variant="outline" size="sm">
                  Manage <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>Currently running test suites</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSuites.length === 0 ? (
              <div className="text-center py-6">
                <Play className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active test suites</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/pages/test-cases">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Suite
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSuites.map((suite) => (
                  <div key={suite.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{suite.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{suite.suite_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {suite.passed_cases}/{suite.total_cases} completed
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${getPassRateColor(suite.progress)}`}>
                        {suite.progress}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className={`h-1 rounded-full transition-all ${
                            suite.progress >= 80 ? 'bg-green-500' :
                            suite.progress >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${suite.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest test executions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recent_activity.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {activity.status && getStatusIcon(activity.status)}
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common test management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/pages/generate">
                <Plus className="h-4 w-4 mr-2" />
                Generate Tests
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pages/requirements">
                <FileText className="h-4 w-4 mr-2" />
                Add Requirement
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pages/test-library">
                <Play className="h-4 w-4 mr-2" />
                Start Test Suite
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}