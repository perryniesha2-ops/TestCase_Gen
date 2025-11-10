// components/test-generation/cross-platform-generator.tsx

"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  Eye, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  Copy,
  type LucideIcon
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Platform {
  id: 'web' | 'mobile' | 'api' | 'accessibility' | 'performance'
  name: string
  icon: LucideIcon
  description: string
  defaultFramework: string
  frameworks: string[]
}

interface PlatformTestCase {
  platform: string
  framework: string
  testCase: {
    title: string
    description: string
    preconditions: string[]
    steps: string[]
    expectedResults: string[]
    automationHints?: string[]
  }
}

const platforms: Platform[] = [
  {
    id: 'web',
    name: 'Web Application',
    icon: Monitor,
    description: 'Browser-based testing across different devices and browsers',
    defaultFramework: 'cypress',
    frameworks: ['cypress', 'playwright', 'selenium']
  },
  {
    id: 'mobile',
    name: 'Mobile Application',
    icon: Smartphone,
    description: 'Native and hybrid mobile app testing for iOS and Android',
    defaultFramework: 'appium',
    frameworks: ['appium', 'detox', 'xamarin']
  },
  {
    id: 'api',
    name: 'API Testing',
    icon: Globe,
    description: 'REST API, GraphQL, and web service testing',
    defaultFramework: 'postman',
    frameworks: ['postman', 'rest-assured', 'supertest']
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    icon: Eye,
    description: 'WCAG compliance and assistive technology testing',
    defaultFramework: 'axe',
    frameworks: ['axe', 'wave', 'lighthouse']
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: Zap,
    description: 'Load, stress, and performance benchmarking',
    defaultFramework: 'lighthouse',
    frameworks: ['lighthouse', 'jmeter', 'k6']
  }
]

export function CrossPlatformGenerator({ userId }: { userId?: string }) {
  const [requirement, setRequirement] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['web'])
  const [testingFrameworks, setTestingFrameworks] = useState<Record<string, string>>({
    web: 'cypress',
    mobile: 'appium',
    api: 'postman',
    accessibility: 'axe',
    performance: 'lighthouse'
  })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, PlatformTestCase[]> | null>(null)
  const [activeTab, setActiveTab] = useState('generator')

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  const handleFrameworkChange = (platformId: string, framework: string) => {
    setTestingFrameworks(prev => ({
      ...prev,
      [platformId]: framework
    }))
  }

  const generateTests = async () => {
    if (!requirement.trim()) {
      toast.error('Please enter a requirement')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch('/api/generate-cross-platform-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement,
          platforms: selectedPlatforms,
          testingFrameworks,
          userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate tests')
      }

      setResults(data.data.platformTests)
      setActiveTab('results')
      
      toast.success(
        `Generated ${data.data.totalTestCases} test cases across ${selectedPlatforms.length} platforms!`
      )

    } catch (error) {
      console.error('Error generating tests:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate tests')
    } finally {
      setLoading(false)
    }
  }

  const exportResults = (format: 'json' | 'csv') => {
    if (!results) return

    const timestamp = new Date().toISOString().split('T')[0]
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cross-platform-tests-${timestamp}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      // Convert to CSV format
      let csv = 'Platform,Framework,Title,Description,Steps,Expected Results\n'
      
      Object.entries(results).forEach(([platform, tests]) => {
        tests.forEach(test => {
          const steps = test.testCase.steps.join('; ')
          const expectedResults = test.testCase.expectedResults.join('; ')
          csv += `"${platform}","${test.framework}","${test.testCase.title}","${test.testCase.description}","${steps}","${expectedResults}"\n`
        })
      })
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cross-platform-tests-${timestamp}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    toast.success(`Exported to ${format.toUpperCase()}`)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const getTotalTestCases = () => {
    if (!results) return 0
    return Object.values(results).reduce((sum, tests) => sum + tests.length, 0)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cross-Platform Test Generator</h1>
        <p className="text-muted-foreground">
          Generate comprehensive test cases across multiple platforms from a single requirement
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="results" disabled={!results}>
            Results {results && `(${getTotalTestCases()})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          {/* Requirement Input */}
          <Card>
            <CardHeader>
              <CardTitle>Requirement</CardTitle>
              <CardDescription>
                Enter the feature or functionality requirement you want to test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Example: User should be able to login with email and password, with optional two-factor authentication"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Testing Platforms</CardTitle>
              <CardDescription>
                Choose which platforms you want to generate test cases for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map((platform) => {
                  const Icon = platform.icon
                  const isSelected = selectedPlatforms.includes(platform.id)
                  
                  return (
                    <div
                      key={platform.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => handlePlatformToggle(platform.id)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{platform.name}</span>
                        {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {platform.description}
                      </p>
                      
                      {isSelected && (
                        <div className="space-y-2">
                          <Label className="text-xs">Testing Framework:</Label>
                          <Select
                            value={testingFrameworks[platform.id]}
                            onValueChange={(value) => handleFrameworkChange(platform.id, value)}
                          >
                            <SelectTrigger className="w-full h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {platform.frameworks.map((framework) => (
                                <SelectItem key={framework} value={framework} className="text-xs">
                                  {framework}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={generateTests}
              disabled={loading || !requirement.trim() || selectedPlatforms.length === 0}
              size="lg"
              className="min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Tests...
                </>
              ) : (
                <>
                  Generate Cross-Platform Tests
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {results && (
            <>
              {/* Results Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Test Generation Results</CardTitle>
                      <CardDescription>
                        Generated {getTotalTestCases()} test cases across {Object.keys(results).length} platforms
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportResults('json')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportResults('csv')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Object.entries(results).map(([platform, tests]) => {
                      const platformInfo = platforms.find(p => p.id === platform)
                      const Icon = platformInfo?.icon || Monitor
                      
                      return (
                        <div key={platform} className="text-center p-4 border rounded-lg">
                          <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <div className="font-semibold capitalize">{platform}</div>
                          <div className="text-2xl font-bold text-primary">{tests.length}</div>
                          <div className="text-xs text-muted-foreground">test cases</div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Platform Results */}
              <div className="space-y-6">
                {Object.entries(results).map(([platform, tests]) => {
                  const platformInfo = platforms.find(p => p.id === platform)
                  const Icon = platformInfo?.icon || Monitor
                  
                  return (
                    <Card key={platform}>
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Icon className="h-6 w-6" />
                          <div>
                            <CardTitle className="capitalize">{platform} Test Cases</CardTitle>
                            <CardDescription>
                              {tests.length} test cases using {tests[0]?.framework}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">{tests.length}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {tests.map((test, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">{test.testCase.title}</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(
                                    `Title: ${test.testCase.title}\n\nDescription: ${test.testCase.description}\n\nSteps:\n${test.testCase.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nExpected Results:\n${test.testCase.expectedResults.map((result, i) => `${i + 1}. ${result}`).join('\n')}`
                                  )}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {test.testCase.description && (
                                <p className="text-sm text-muted-foreground mb-3">
                                  {test.testCase.description}
                                </p>
                              )}

                              {test.testCase.preconditions.length > 0 && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-sm mb-1">Preconditions:</h5>
                                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                                    {test.testCase.preconditions.map((condition, i) => (
                                      <li key={i}>{condition}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="font-medium text-sm mb-2">Test Steps:</h5>
                                  <ol className="text-sm space-y-1 list-decimal list-inside">
                                    {test.testCase.steps.map((step, i) => (
                                      <li key={i} className="text-muted-foreground">{step}</li>
                                    ))}
                                  </ol>
                                </div>
                                
                                <div>
                                  <h5 className="font-medium text-sm mb-2">Expected Results:</h5>
                                  <ul className="text-sm space-y-1 list-disc list-inside">
                                    {test.testCase.expectedResults.map((result, i) => (
                                      <li key={i} className="text-muted-foreground">{result}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {test.testCase.automationHints && test.testCase.automationHints.length > 0 && (
                                <Alert className="mt-3">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>Automation Hints:</strong> {test.testCase.automationHints.join(', ')}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}