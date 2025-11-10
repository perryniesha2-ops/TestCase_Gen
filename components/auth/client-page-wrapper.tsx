"use client"

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

interface ClientPageWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientPageWrapper({ children, fallback }: ClientPageWrapperProps) {
  return (
    <Suspense fallback={fallback || <ClientPageFallback />}>
      {children}
    </Suspense>
  )
}

function ClientPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Loading page...</span>
      </div>
    </div>
  )
}

// Specific wrapper for test case pages that commonly use search params
export function TestCasePageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading test cases...</span>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}

// Wrapper for forms that use search params
export function FormPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Preparing form...</span>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}