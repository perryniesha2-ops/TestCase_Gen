// lib/utils/requirement-helpers.tsx

import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, Target } from "lucide-react"

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    functional: 'bg-blue-500 text-white',
    user_story: 'bg-green-500 text-white',
    use_case: 'bg-purple-500 text-white',
    non_functional: 'bg-orange-500 text-white'
  }
  return colors[type] || 'bg-gray-500 text-white'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white'
  }
  return colors[priority] || 'bg-gray-500 text-white'
}

export function getStatusBadge(status: 'draft' | 'active' | 'archived') {
  const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
    draft: { variant: 'outline', label: 'Draft' },
    active: { variant: 'default', label: 'Active' },
    archived: { variant: 'secondary', label: 'Archived' }
  }
  const config = variants[status] || variants.draft
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function getCoverageColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600'
  if (percentage >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export function getCoverageIcon(percentage: number) {
  if (percentage >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
  if (percentage >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  return <Target className="h-4 w-4 text-red-600" />
}

export function getProjectColor(color: string): string {
  const colors: Record<string, string> = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    pink: 'text-pink-500',
    indigo: 'text-indigo-500',
    yellow: 'text-yellow-500',
    gray: 'text-gray-500'
  }
  return colors[color] || 'text-gray-500'
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} mins ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}