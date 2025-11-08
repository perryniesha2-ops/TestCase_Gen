"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Info } from "lucide-react"

// Placeholder requirements - will be replaced with dropdown from database
const PLACEHOLDER_REQUIREMENTS = [
  { id: 'custom', label: 'Custom Requirements (Type your own)', value: '' },
  { 
    id: 'login', 
    label: 'User Login Functionality',
    value: `User Login Functionality:
- Email and password authentication
- Password must be at least 8 characters with 1 number and 1 special character
- Show specific error messages for invalid credentials
- "Remember me" checkbox for persistent sessions
- Account lockout after 5 failed login attempts
- Password reset via email link
- Session timeout after 30 minutes of inactivity`
  },
  {
    id: 'shopping-cart',
    label: 'Shopping Cart',
    value: `Shopping Cart Functionality:
- Add items to cart with quantity selection
- Update item quantities (min 1, max 10 per item)
- Remove items from cart
- Calculate subtotal, tax (10%), and total
- Apply discount codes (validate format and expiration)
- Maximum 20 unique items in cart
- Save cart state for logged-in users
- Empty cart after checkout`
  },
  {
    id: 'file-upload',
    label: 'File Upload',
    value: `File Upload Functionality:
- Support PDF, DOCX, JPG, PNG file types
- Maximum file size: 10MB
- Validate file type and size before upload
- Show upload progress indicator
- Display error messages for unsupported formats
- Virus scan all uploaded files
- Store files with unique identifiers
- Generate downloadable links with expiration`
  }
]

export function GeneratorForm() {
  const [loading, setLoading] = useState(false)
  const [selectedRequirement, setSelectedRequirement] = useState('custom')
  const [customRequirements, setCustomRequirements] = useState('')
  const router = useRouter()

  const requirementsText = selectedRequirement === 'custom' 
    ? customRequirements 
    : PLACEHOLDER_REQUIREMENTS.find(r => r.id === selectedRequirement)?.value || ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const model = formData.get('model') as string
    const testCaseCount = parseInt(formData.get('testCaseCount') as string)
    const coverage = formData.get('coverage') as string
    const template = formData.get('template') as string

    if (!requirementsText) {
      toast.error('Please enter requirements or select a preset')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/generate-test-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: requirementsText,
          model,
          testCaseCount,
          coverage,
          template,
          title,
          description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details || data.error || 'Failed to generate test cases'
        const errorHint = data.hint ? `\nHint: ${data.hint}` : ''
        throw new Error(errorMessage + errorHint)
      }

      toast.success('Test cases generated!', {
        description: `Created ${data.count} test cases using ${data.provider_used}`,
      })

      // Redirect to the test cases list
      router.push(`/dashboard/pages/test-cases?generation=${data.generation_id}`)
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Generation failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 7000, // Show error longer
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Generate Test Cases
        </CardTitle>
        <CardDescription>
          Configure your test case generation with AI models and coverage options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Test Suite Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., User Authentication Test Suite"
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Brief description of what you're testing"
              disabled={loading}
            />
          </div>

          {/* Grid layout for model selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">
                AI Model <span className="text-destructive">*</span>
              </Label>
              <Select name="model" defaultValue="claude-sonnet" disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet">Claude Sonnet 4 (Recommended)</SelectItem>
                  <SelectItem value="claude-opus">Claude Opus 4 (Most Capable)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (Fast & Reliable)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Economical)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Primary model with automatic fallback
              </p>
            </div>

            {/* Number of Test Cases */}
            <div className="space-y-2">
              <Label htmlFor="testCaseCount">
                Number of Test Cases <span className="text-destructive">*</span>
              </Label>
              <Select name="testCaseCount" defaultValue="10" disabled={loading}>
                <SelectTrigger>
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

          {/* Coverage Level */}
          <div className="space-y-2">
            <Label htmlFor="coverage">
              Coverage Level <span className="text-destructive">*</span>
            </Label>
            <Select name="coverage" defaultValue="comprehensive" disabled={loading}>
              <SelectTrigger>
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

          {/* Template Selection - Placeholder for future */}
          <div className="space-y-2">
            <Label htmlFor="template">
              Template <span className="text-muted-foreground text-xs">(Coming Soon)</span>
            </Label>
            <Select name="template" defaultValue="none" disabled={true}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Template</SelectItem>
                <SelectItem value="default">Default Template</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Custom templates will allow you to define your own test case structure
            </p>
          </div>

          {/* Requirements Selection */}
          <div className="space-y-2">
            <Label htmlFor="requirement-select">
              Requirements <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={selectedRequirement} 
              onValueChange={setSelectedRequirement}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select or create requirements" />
              </SelectTrigger>
              <SelectContent>
                {PLACEHOLDER_REQUIREMENTS.map(req => (
                  <SelectItem key={req.id} value={req.id}>
                    {req.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requirements Display/Edit */}
          {selectedRequirement === 'custom' ? (
            <div className="space-y-2">
              <Label htmlFor="custom-requirements">
                Enter Your Requirements <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="custom-requirements"
                className="w-full min-h-[200px] p-3 text-sm border rounded-md font-mono resize-y"
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
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <Info className="h-3 w-3 mt-0.5" />
                The more detailed your requirements, the better the generated test cases will be.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Requirements Acceptance Criteria</Label>
              <div className="p-4 border rounded-md bg-muted/50">
                <pre className="text-sm whitespace-pre-wrap font-mono">{requirementsText}</pre>
              </div>
              <p className="text-xs text-muted-foreground">
                Select &ldquo;Custom Requirements&ldquo; to write your own
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating test cases...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Test Cases
              </>
            )}
          </Button>

          {loading && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                This may take 30-90 seconds depending on the number of test cases...
              </p>
              <p className="text-xs text-muted-foreground">
                Using AI model with automatic fallback for reliability
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}