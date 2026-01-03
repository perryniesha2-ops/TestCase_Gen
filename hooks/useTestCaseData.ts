"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  TestCase,
  CrossPlatformTestCase,
  Generation,
  CrossPlatformSuite,
  TestSession,
  Project,
} from "@/types/test-cases"

type UseTestCaseDataArgs = {
  generationId: string | null
  sessionId: string | null
  selectedProject: string
}

type UseTestCaseDataResult = {
  loading: boolean
  testCases: TestCase[]
  crossPlatformCases: CrossPlatformTestCase[]
  projects: Project[]
  currentSession: TestSession | null
  generations: Record<string, Generation>
  crossPlatformSuites: Record<string, CrossPlatformSuite>
  refresh: () => Promise<void>
}

export function useTestCaseData({
  generationId,
  sessionId,
  selectedProject,
}: UseTestCaseDataArgs): UseTestCaseDataResult {
  const [loading, setLoading] = useState(true)

  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [crossPlatformCases, setCrossPlatformCases] = useState<CrossPlatformTestCase[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [currentSession, setCurrentSession] = useState<TestSession | null>(null)

  const [generations, setGenerations] = useState<Record<string, Generation>>({})
  const [crossPlatformSuites, setCrossPlatformSuites] = useState<Record<string, CrossPlatformSuite>>(
    {}
  )

  const fetchProjects = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, color, icon")
      .eq("user_id", user.id)
      .order("name")

    if (error) throw error
    setProjects(data || [])
  }, [])

  const fetchTestSession = useCallback(async () => {
    if (!sessionId) {
      setCurrentSession(null)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from("test_run_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (error) throw error
    setCurrentSession(data)
  }, [sessionId])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // caller can toast
        setTestCases([])
        setCrossPlatformCases([])
        return
      }

      // Regular test cases
      let testCaseQuery = supabase
        .from("test_cases")
        .select(`*, projects:project_id(id, name, color, icon)`)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (generationId) testCaseQuery = testCaseQuery.eq("generation_id", generationId)
      if (selectedProject) testCaseQuery = testCaseQuery.eq("project_id", selectedProject)

      const { data: testCasesData, error: testCasesError } = await testCaseQuery
      if (testCasesError) throw testCasesError
      setTestCases(testCasesData || [])

      // Cross-platform test cases
      const { data: crossPlatformData, error: crossPlatformError } = await supabase
        .from("platform_test_cases")
        .select(
          `
          *,
          cross_platform_test_suites!inner(
            id,
            requirement,
            user_id,
            platforms,
            generated_at
          )
        `
        )
        .eq("cross_platform_test_suites.user_id", user.id)
        .order("created_at", { ascending: false })

      if (crossPlatformError) throw crossPlatformError
      setCrossPlatformCases(crossPlatformData || [])

      // Generations
      const { data: generationsData, error: generationsError } = await supabase
        .from("test_case_generations")
        .select("id, title")
        .eq("user_id", user.id)

      if (generationsError) throw generationsError
      const generationsMap: Record<string, Generation> = {}
      generationsData?.forEach((gen) => {
        generationsMap[gen.id] = gen
      })
      setGenerations(generationsMap)

      // Cross-platform suites
      const { data: suitesData, error: suitesError } = await supabase
        .from("cross_platform_test_suites")
        .select("*")
        .eq("user_id", user.id)

      if (suitesError) throw suitesError
      const suitesMap: Record<string, CrossPlatformSuite> = {}
      suitesData?.forEach((suite) => {
        suitesMap[suite.id] = suite
      })
      setCrossPlatformSuites(suitesMap)
    } finally {
      setLoading(false)
    }
  }, [generationId, selectedProject])

  useEffect(() => {
    // load once
    void fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    // session changes
    void fetchTestSession()
  }, [fetchTestSession])

  useEffect(() => {
    // data changes
    void refresh()
  }, [refresh])

  return {
    loading,
    testCases,
    crossPlatformCases,
    projects,
    currentSession,
    generations,
    crossPlatformSuites,
    refresh,
  }
}
