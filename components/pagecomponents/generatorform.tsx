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
import { Loader2, Sparkles, Info, FileText, Plus } from "lucide-react"
import { AddRequirementModal } from "@/components/pagecomponents/add-requirement-modal"
import Link from "next/link"

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

export function GeneratorForm() {
  const [loading, setLoading] = useState(false)
  const [savedRequirements, setSavedRequirements] = useState<RequirementOption[]>([])
  const [mode, setMode] = useState<"quick" | "saved">("quick")
  const [selectedRequirement, setSelectedRequirement] = useState("")
  const [customRequirements, setCustomRequirements] = useState("")
  const [fetchingRequirements, setFetchingRequirements] = useState(true)
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
        value: req.description // Use description as the value for generation
      }))

      console.log('✅ Database requirements converted:', dbRequirements)
      setSavedRequirements(dbRequirements)
      
      // If we have saved requirements and mode is saved but nothing selected, select first one
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
    fetchRequirements()
  }, [])

  // Get all available requirements (saved + placeholders if no saved requirements)
  const availableRequirements = savedRequirements.length > 0 
    ? savedRequirements 
    : PLACEHOLDER_REQUIREMENTS

  // When switching modes, ensure correct control is active
  function switchMode(nextMode: "quick" | "saved") {
    setMode(nextMode)
    if (nextMode === "saved") {
      // If switching to saved mode and no requirement selected, select the first available
      if (!selectedRequirement && availableRequirements.length > 0) {
        setSelectedRequirement(availableRequirements[0].id)
      }
    }
  }

  const selectedReqData = availableRequirements.find(r => r.id === selectedRequirement)
  const savedRequirementsText = selectedReqData?.value || ""
  const finalRequirementsText = mode === "quick" ? customRequirements : savedRequirementsText

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const title = formData.get("title") as string
      const description = formData.get("description") as string
      const model = formData.get("model") as string
      const testCaseCountStr = formData.get("testCaseCount") as string
      const coverage = formData.get("coverage") as string
      const template = formData.get("template") as string

      // Parse and validate testCaseCount
      const testCaseCount = parseInt(testCaseCountStr, 10)
      if (isNaN(testCaseCount) || testCaseCount < 1 || testCaseCount > 100) {
        toast.error("Please select a valid number of test cases.")
        setLoading(false)
        return
      }

      // Validate requirements based on mode
      if (mode === "quick" && !customRequirements.trim()) {
        toast.error("Please enter your requirements.")
        setLoading(false)
        return
      }
      
      if (mode === "saved" && !savedRequirementsText.trim()) {
        toast.error("Please select a requirement.")
        setLoading(false)
        return
      }

      // Validate other required fields
      if (!title?.trim()) {
        toast.error("Please enter a generation title.")
        setLoading(false)
        return
      }

      if (!model?.trim()) {
        toast.error("Please select an AI model.")
        setLoading(false)
        return
      }

      if (!coverage?.trim()) {
        toast.error("Please select a coverage level.")
        setLoading(false)
        return
      }

      // Prepare request payload
      const requestPayload = {
        requirements: finalRequirementsText.trim(),
        requirement_id: mode === "saved" && savedRequirements.find(r => r.id === selectedRequirement)
          ? selectedRequirement
          : null,
        model: model.trim(),
        testCaseCount: testCaseCount, // Ensure this is a number
        coverage: coverage.trim(),
        template: template?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
      }

      console.log('🚀 Sending request payload:', requestPayload)

      const response = await fetch("/api/generate-test-cases", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(requestPayload),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('❌ API Error Response:', data)
        throw new Error(data.error || data.details || `HTTP ${response.status}: Failed to generate test cases`)
      }

      console.log('✅ Success Response:', data)

      toast.success("Test cases generated!", {
        description: `Created ${data.count} test cases using ${data.provider_used}`,
      })

      // Correct redirect path
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

  return (
    <Card className="mx-auto w-full max-w-7xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Test Case Generator
        </CardTitle>
        <CardDescription>Configure your test case generation with AI models and coverage options</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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

                {/* Progressive Disclosure - Save Suggestion */}
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

                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5" />
                  The more detailed your requirements, the better the generated test cases will be.
                </p>
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
                        {savedRequirements.length === 0 && (
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            Example Requirements
                          </div>
                        )}
                        
                        {availableRequirements.map(req => (
                          <SelectItem key={req.id} value={req.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${savedRequirements.length > 0 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                              {req.label}
                            </div>
                          </SelectItem>
                        ))}
                        
                        {savedRequirements.length === 0 && (
                          <div className="px-2 py-2 text-xs text-muted-foreground border-t">
                            💡 These are examples. Create your own requirements for better organization!
                          </div>
                        )}
                      </SelectContent>
                    </Select>

                    {/* Requirement Preview */}
                    {selectedReqData && (
                      <div className="border rounded-md bg-muted/20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b bg-muted/40">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">
                              {selectedReqData.title || selectedReqData.label}
                            </h4>
                            {selectedReqData.type && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className={`px-2 py-1 rounded text-white text-xs ${
                                  selectedReqData.type === 'functional' ? 'bg-blue-500' :
                                  selectedReqData.type === 'user_story' ? 'bg-green-500' :
                                  selectedReqData.type === 'use_case' ? 'bg-purple-500' :
                                  selectedReqData.type === 'non_functional' ? 'bg-orange-500' :
                                  'bg-gray-500'
                                }`}>
                                  {selectedReqData.type.replace('_', ' ')}
                                </span>
                                {selectedReqData.priority && (
                                  <span className={`px-2 py-1 rounded text-white text-xs ${
                                    selectedReqData.priority === 'critical' ? 'bg-red-500' :
                                    selectedReqData.priority === 'high' ? 'bg-orange-500' :
                                    selectedReqData.priority === 'medium' ? 'bg-yellow-500 text-black' :
                                    selectedReqData.priority === 'low' ? 'bg-blue-500' :
                                    'bg-gray-500'
                                  }`}>
                                    {selectedReqData.priority}
                                  </span>
                                )}
                              </div>
                            )}
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
                        
                        {/* Content */}
                        <div className="p-3">
                          <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                            {savedRequirementsText}
                          </pre>
                        </div>
                      </div>
                    )}

                    {savedRequirements.length === 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>No saved requirements yet!</strong> You&apos;re seeing example requirements. 
                          <Link href="/pages/requirements" className="text-blue-600 hover:underline ml-1">
                            Create your own requirements
                          </Link>
                          {" "}for better organization and reusability.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Need to modify? Switch to Quick Entry mode</span>
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm" 
                        onClick={() => {
                          setCustomRequirements(savedRequirementsText)
                          switchMode("quick")
                        }}
                        className="h-auto p-0 text-xs"
                      >
                        Copy & Edit
                      </Button>
                    </div>
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
                <SelectItem value="standard">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Standard</span>
                    <span className="text-xs text-muted-foreground">Main functionality and common scenarios</span>
                  </div>
                </SelectItem>
                <SelectItem value="comprehensive">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Comprehensive (Recommended)</span>
                    <span className="text-xs text-muted-foreground">Includes edge cases and error handling</span>
                  </div>
                </SelectItem>
                <SelectItem value="exhaustive">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Exhaustive</span>
                    <span className="text-xs text-muted-foreground">All scenarios including security & performance</span>
                  </div>
                </SelectItem>
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
      </CardContent>
    </Card>
  )
}