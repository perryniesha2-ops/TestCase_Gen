"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Sparkles, Info, FileText, Plus, FlaskConical, Layers, Monitor, Smartphone, Globe, Eye, Zap } from "lucide-react"
import { AddRequirementModal } from "@/components/pagecomponents/add-requirement-modal"
import Link from "next/link"
import { checkAndRecordUsage } from '@/lib/usage-tracker'

interface DatabaseRequirement {
  id: string
  title: string
  description: string
  type: string
  priority: string
}

interface RequirementOption {
  id: string
  label: string
  title: string
  description: string
  type: string
  priority: string
  value: string
}
type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
};

const PLACEHOLDER_REQUIREMENTS: RequirementOption[] = [
  {
    id: "login",
    label: "User Login Functionality",
    title: "User Authentication System",
    description: "System to authenticate users with email and password",
    type: "functional",
    priority: "high",
    value: `User Login Functionality:
- Email and password authentication
- Password must be at least 8 characters with 1 number and 1 special character
- Show specific error messages for invalid credentials
- "Remember me" checkbox for persistent sessions
- Account lockout after 5 failed login attempts
- Password reset via email link
- Session timeout after 30 minutes of inactivity`,
  },
  {
    id: "shopping-cart",
    label: "Shopping Cart",
    title: "E-commerce Shopping Cart",
    description: "Shopping cart functionality for e-commerce platform",
    type: "functional",
    priority: "medium",
    value: `Shopping Cart Functionality:
- Add items to cart with quantity selection
- Update item quantities (min 1, max 10 per item)
- Remove items from cart
- Calculate subtotal, tax (10%), and total
- Apply discount codes (validate format and expiration)
- Maximum 20 unique items in cart
- Save cart state for logged-in users
- Empty cart after checkout`,
  },
  {
    id: "file-upload",
    label: "File Upload System",
    title: "Document Upload Functionality",
    description: "File upload system with validation and security",
    type: "functional",
    priority: "medium",
    value: `File Upload Functionality:
- Support PDF, DOCX, JPG, PNG file types
- Maximum file size: 10MB per file
- Validate file type and size before upload
- Show upload progress indicator
- Display error messages for unsupported formats
- Virus scan all uploaded files
- Store files with unique identifiers
- Generate downloadable links with expiration`,
  }
]

const platformOptions = [
  { id: 'web', name: 'Web Application', icon: Monitor, description: 'Browser-based testing' },
  { id: 'mobile', name: 'Mobile App', icon: Smartphone, description: 'iOS/Android testing' },
  { id: 'api', name: 'API/Backend', icon: Globe, description: 'REST/GraphQL API testing' },
  { id: 'accessibility', name: 'Accessibility', icon: Eye, description: 'WCAG compliance testing' },
  { id: 'performance', name: 'Performance', icon: Zap, description: 'Load & speed testing' }
]

const frameworkOptions = {
  web: ['React', 'Vue', 'Angular', 'Vanilla JS', 'Next.js', 'Nuxt.js'],
  mobile: ['React Native', 'Flutter', 'Native iOS', 'Native Android', 'Xamarin', 'Ionic'],
  api: ['REST API', 'GraphQL', 'SOAP', 'gRPC', 'WebSocket', 'Microservices'],
  accessibility: ['WCAG 2.1 AA', 'WCAG 2.1 AAA', 'Section 508', 'ADA Compliance'],
  performance: ['Load Testing', 'Stress Testing', 'Volume Testing', 'Spike Testing']
}

type GenerationType = 'regular' | 'cross-platform'

export function GeneratorForm() {
  const [generationType, setGenerationType] = useState<GenerationType>('regular')
  const [loading, setLoading] = useState(false)
  const [savedRequirements, setSavedRequirements] = useState<RequirementOption[]>([])
  const [mode, setMode] = useState<"quick" | "saved">("quick")
  const [selectedRequirement, setSelectedRequirement] = useState("")
  const [customRequirements, setCustomRequirements] = useState("")
  const [fetchingRequirements, setFetchingRequirements] = useState(true)
  
  // Cross-platform specific state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<Record<string, string>>({})
  const [user, setUser] = useState<UserProfile | null>(null)
    const supabase = createClient();

  
  const router = useRouter()

  async function fetchRequirements() {
    setFetchingRequirements(true)
    try {
      const supabase = createClient()
      console.log('🔍 Fetching requirements from database...')
      
      const { data, error } = await supabase
        .from('requirements')
        .select('id, title, description, type, priority, status')
        .order('title', { ascending: true })

      console.log('📊 Requirements query result:', { data, error })

      if (error) throw error

      // Convert database requirements to RequirementOption format
      const dbRequirements: RequirementOption[] = (data || []).map(req => ({
        id: req.id,
        label: `${req.title} (${req.type})`,
        title: req.title,
        description: req.description,
        type: req.type,
        priority: req.priority,
        value: req.description
      }))

      console.log('✅ Database requirements converted:', dbRequirements)
      setSavedRequirements(dbRequirements)
      
      if (dbRequirements.length > 0 && mode === "saved" && !selectedRequirement) {
        setSelectedRequirement(dbRequirements[0].id)
      }
    } catch (error) {
      console.error('❌ Error fetching requirements:', error)
      setSavedRequirements([])
    } finally {
      setFetchingRequirements(false)
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "",
            avatar_url: user.user_metadata?.avatar_url || "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    fetchRequirements()
  }, [])

  const availableRequirements = savedRequirements.length > 0 
    ? savedRequirements 
    : PLACEHOLDER_REQUIREMENTS

  function switchMode(nextMode: "quick" | "saved") {
    setMode(nextMode)
    if (nextMode === "saved") {
      if (!selectedRequirement && availableRequirements.length > 0) {
        setSelectedRequirement(availableRequirements[0].id)
      }
    }
  }

  const selectedReqData = availableRequirements.find(r => r.id === selectedRequirement)
  const savedRequirementsText = selectedReqData?.value || ""
  const finalRequirementsText = mode === "quick" ? customRequirements : savedRequirementsText



  // Handle platform selection
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        const newFrameworks = { ...selectedFrameworks }
        delete newFrameworks[platformId]
        setSelectedFrameworks(newFrameworks)
        return prev.filter(id => id !== platformId)
      } else {
        return [...prev, platformId]
      }
    })
  }

  const setFrameworkForPlatform = (platformId: string, framework: string) => {
    setSelectedFrameworks(prev => ({
      ...prev,
      [platformId]: framework
    }))
  }

  async function handleRegularSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    if (!user) {
    toast.error("Please sign in to generate test cases")
    router.push('/pages/login')
    return
  }

    try {
      const formData = new FormData(e.currentTarget)
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const model = formData.get("model") as string
      const testCaseCountStr = formData.get("testCaseCount") as string
      const coverage = formData.get("coverage") as string
      const template = formData.get("template") as string

      const testCaseCount = parseInt(testCaseCountStr, 10)
      if (isNaN(testCaseCount) || testCaseCount < 1 || testCaseCount > 100) {
        toast.error("Please select a valid number of test cases.")
        return
      }

      if (mode === "quick" && !customRequirements.trim()) {
        toast.error("Please enter your requirements.")
        return
      }
      
      if (mode === "saved" && !savedRequirementsText.trim()) {
        toast.error("Please select a requirement.")
        return
      }

      if (!title?.trim()) {
        toast.error("Please enter a generation title.")
        return
      }

      const requestPayload = {
        requirements: finalRequirementsText.trim(),
        requirement_id: mode === "saved" && savedRequirements.find(r => r.id === selectedRequirement)
          ? selectedRequirement
          : null,
        model: model.trim(),
        testCaseCount: testCaseCount,
        coverage: coverage.trim(),
        template: template?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
      }

      console.log('🚀 Sending regular request payload:', requestPayload)

      const response = await fetch("/api/generate-test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
       
      })
        const data = await response.json()

      if (response.status === 429) {
  toast.error(data.error, {
    description: "Upgrade to Pro for 500 test cases/month",
    action: {
      label: "Upgrade",
      onClick: () => router.push('/billing')
    }
  })
  return
}

      
      if (!response.ok) {
        throw new Error(data.error || data.details || `HTTP ${response.status}: Failed to generate test cases`)
      }

      toast.success("Test cases generated!", {
        description: `Created ${data.count} test cases using ${data.provider_used}`,
      })

      router.push(`/pages/test-cases?generation=${data.generation_id}`)

    } catch (err) {
      console.error('❌ Generation error:', err)
      toast.error("Unable to generate test cases", {
        description: err instanceof Error ? err.message : "Please try again later",
        duration: 7000,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCrossPlatformSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const requirement = formData.get("requirement") as string
      const model = formData.get("model") as string

      // Validation
      if (!requirement?.trim()) {
        toast.error("Please enter the requirement description.")
        return
      }

      if (selectedPlatforms.length === 0) {
        toast.error("Please select at least one platform.")
        return
      }

      // Check that all selected platforms have frameworks
      for (const platform of selectedPlatforms) {
        if (!selectedFrameworks[platform]) {
          toast.error(`Please select a framework for ${platformOptions.find(p => p.id === platform)?.name}.`)
          return
        }
      }

      // Prepare platforms data
      const platformsData = selectedPlatforms.map(platformId => ({
        platform: platformId,
        framework: selectedFrameworks[platformId]
      }))

      const requestPayload = {
        requirement: requirement.trim(),
        platforms: platformsData,
        model: model?.trim() || "claude-3-5-sonnet-20241022"
      }

      console.log('🚀 Sending cross-platform request payload:', requestPayload)

      const response = await fetch("/api/cross-platform-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || data.details || `HTTP ${response.status}: Failed to generate cross-platform tests`)
      }

      toast.success("Cross-platform tests generated!", {
        description: `Created test suite with ${data.total_test_cases} test cases across ${selectedPlatforms.length} platforms`,
      })

      router.push(`/pages/test-cases`)

    } catch (err) {
      console.error('❌ Cross-platform generation error:', err)
      toast.error("Unable to generate cross-platform tests", {
        description: err instanceof Error ? err.message : "Please try again later",
        duration: 7000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-7xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Test Case Generator
        </CardTitle>
        <CardDescription>Generate comprehensive test cases with AI models across different platforms and coverage levels</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Generation Type Toggle */}
        <div className="mb-6">
          <Label className="text-base font-medium mb-3 block">Generation Type</Label>
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={generationType === "regular" ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-10"
              onClick={() => setGenerationType("regular")}
              disabled={loading}
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Regular Test Cases
            </Button>
            <Button
              type="button"
              variant={generationType === "cross-platform" ? "default" : "ghost"}
              size="sm"
              className="flex-1 h-10"
              onClick={() => setGenerationType("cross-platform")}
              disabled={loading}
            >
              <Layers className="h-4 w-4 mr-2" />
              Cross-Platform Testing
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {generationType === "regular" 
              ? "Generate traditional test cases for specific requirements"
              : "Generate test cases optimized for multiple platforms and frameworks"
            }
          </p>
        </div>

        {/* Regular Test Case Generation Form */}
        {generationType === "regular" && (
          <form onSubmit={handleRegularSubmit} className="space-y-6">
            {/* Title / Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Generation Title *</Label>
                <Input id="title" name="title" placeholder="e.g., User Login Test Cases" required disabled={loading} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Brief description..." disabled={loading} className="h-10" />
              </div>
            </div>

            {/* Requirements Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Requirements</Label>
                <Button asChild variant="ghost" size="sm" className="h-8">
                  <Link href="/pages/requirements">
                    <FileText className="h-4 w-4 mr-1" />
                    Manage Requirements
                  </Link>
                </Button>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                <Button
                  type="button"
                  variant={mode === "quick" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => switchMode("quick")}
                  disabled={loading}
                >
                  Quick Entry
                </Button>
                <Button
                  type="button"
                  variant={mode === "saved" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => switchMode("saved")}
                  disabled={loading}
                >
                  {savedRequirements.length > 0 ? "Saved Requirements" : "Example Requirements"}
                </Button>
              </div>

              {/* Quick Entry Mode */}
              {mode === "quick" && (
                <div className="space-y-3">
                  <Label htmlFor="custom-requirements" className="text-sm">
                    Describe your requirements <span className="text-destructive">*</span>
                  </Label>
                  <textarea
                    id="custom-requirements"
                    className="w-full min-h-[200px] p-3 text-sm border rounded-md font-mono resize-y focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="Describe what you want to test. Be as detailed as possible.

Example:
- User login functionality
- Must support email and password
- Password must be at least 8 characters
- Should show error messages for invalid credentials
- Remember me functionality
- Password reset via email"
                    value={customRequirements}
                    onChange={(e) => setCustomRequirements(e.target.value)}
                    disabled={loading}
                    required
                  />

                  {customRequirements.length > 50 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500 rounded-full p-1 mt-0.5">
                          <Info className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 mb-2">
                            💡 Want to save this for later?
                          </p>
                          <p className="text-xs text-blue-700 mb-3">
                            Save as a requirement to reuse it and build your requirement library.
                          </p>
                          <AddRequirementModal
                            onRequirementAdded={() => {
                              fetchRequirements()
                              toast.success('Requirement saved! You can now select it from Saved Requirements.')
                            }}
                          >
                            <Button type="button" size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                              💾 Save as Requirement
                            </Button>
                          </AddRequirementModal>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Saved Requirements Mode */}
              {mode === "saved" && (
                <div className="space-y-3">
                  {fetchingRequirements ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading requirements...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm flex-1">
                          {savedRequirements.length > 0 
                            ? "Select a saved requirement" 
                            : "Example requirements (create your own to save them)"} 
                          <span className="text-destructive">*</span>
                        </Label>
                        <AddRequirementModal onRequirementAdded={fetchRequirements}>
                          <Button type="button" variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            New
                          </Button>
                        </AddRequirementModal>
                      </div>
                      
                      <Select 
                        value={selectedRequirement} 
                        onValueChange={setSelectedRequirement}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select a requirement" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRequirements.map(req => (
                            <SelectItem key={req.id} value={req.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${savedRequirements.length > 0 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                                {req.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedReqData && (
                        <div className="border rounded-md bg-muted/20">
                          <div className="flex items-center justify-between p-3 border-b bg-muted/40">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">
                                {selectedReqData.title || selectedReqData.label}
                              </h4>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCustomRequirements(savedRequirementsText)
                                switchMode("quick")
                              }}
                              disabled={loading}
                            >
                              ✏️ Customize
                            </Button>
                          </div>
                          <div className="p-3">
                            <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                              {savedRequirementsText}
                            </pre>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <Select name="model" defaultValue="claude-3-5-sonnet-20241022" disabled={loading}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (Alternative)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (Economical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testCaseCount">Number of Test Cases</Label>
                <Select name="testCaseCount" defaultValue="10" disabled={loading}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 test cases</SelectItem>
                    <SelectItem value="10">10 test cases</SelectItem>
                    <SelectItem value="15">15 test cases</SelectItem>
                    <SelectItem value="20">20 test cases</SelectItem>
                    <SelectItem value="30">30 test cases</SelectItem>
                    <SelectItem value="50">50 test cases</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage">Coverage Level</Label>
              <Select name="coverage" defaultValue="comprehensive" disabled={loading}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select coverage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard - Main functionality</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive - Includes edge cases</SelectItem>
                  <SelectItem value="exhaustive">Exhaustive - All scenarios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating test cases…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Test Cases
                </>
              )}
            </Button>
          </form>
        )}

        {/* Cross-Platform Test Generation Form */}
        {generationType === "cross-platform" && (
          <form onSubmit={handleCrossPlatformSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="requirement" className="text-base font-medium">
                Requirement Description *
              </Label>
              <textarea
                id="requirement"
                name="requirement"
                className="w-full min-h-[120px] p-3 text-sm border rounded-md resize-y focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Describe the requirement you want to test across platforms.

Example:
User authentication functionality that works consistently across web and mobile platforms, including login, logout, password reset, and session management."
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Describe what functionality you want to test across multiple platforms.
              </p>
            </div>

            {/* Platform Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Target Platforms *</Label>
              <p className="text-sm text-muted-foreground">
                Select the platforms you want to test and choose the specific framework for each.
              </p>
              
              <div className="grid gap-4">
                {platformOptions.map((platform) => {
                  const Icon = platform.icon
                  const isSelected = selectedPlatforms.includes(platform.id)
                  
                  return (
                    <div key={platform.id} className={`border rounded-lg p-4 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={platform.id}
                          checked={isSelected}
                          onCheckedChange={() => togglePlatform(platform.id)}
                          disabled={loading}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <Label htmlFor={platform.id} className="text-sm font-medium cursor-pointer">
                                {platform.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">{platform.description}</p>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="space-y-2">
                              <Label className="text-sm">Framework/Technology</Label>
                              <Select
                                value={selectedFrameworks[platform.id] || ""}
                                onValueChange={(value) => setFrameworkForPlatform(platform.id, value)}
                                disabled={loading}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder={`Select ${platform.name.toLowerCase()} framework`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {frameworkOptions[platform.id as keyof typeof frameworkOptions]?.map((framework) => (
                                    <SelectItem key={framework} value={framework}>
                                      {framework}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {selectedPlatforms.length === 0 && (
                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                  Select at least one platform to generate cross-platform test cases.
                </p>
              )}
            </div>

            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select name="model" defaultValue="claude-3-5-sonnet-20241022" disabled={loading}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recommended)</SelectItem>
                  <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fast)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Alternative)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={loading || selectedPlatforms.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating cross-platform tests…
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Generate Cross-Platform Tests
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}