"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Clock,
  MousePointer,
  Type,
  Navigation,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  ExternalLink
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// Simple time formatter (replaces date-fns)
function formatTimeAgo(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  return new Date(date).toLocaleDateString()
}

interface Recording {
  id: string
  url: string
  actions: any[]
  duration_ms: number
  viewport: any
  recorded_at: string
  browser_info: any
}

interface RecordingsListProps {
  testCaseId: string
  onRunTest: (recording: Recording) => void
}

export function RecordingsList({ testCaseId, onRunTest }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadRecordings()
  }, [testCaseId])

  async function loadRecordings() {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('browser_recordings')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('recorded_at', { ascending: false })

      if (error) throw error

      setRecordings(data || [])
      
      // Auto-select first recording
      if (data && data.length > 0 && !selectedRecording) {
        setSelectedRecording(data[0])
      }
    } catch (error) {
      console.error('Error loading recordings:', error)
      toast.error('Failed to load recordings')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(recordingId: string) {
    if (!confirm('Delete this recording?')) return

    try {
      setDeleting(recordingId)
      const supabase = createClient()

      const { error } = await supabase
        .from('browser_recordings')
        .delete()
        .eq('id', recordingId)

      if (error) throw error

      toast.success('Recording deleted')
      
      // Remove from list
      setRecordings(prev => prev.filter(r => r.id !== recordingId))
      
      // Clear selection if deleted
      if (selectedRecording?.id === recordingId) {
        setSelectedRecording(recordings[0] || null)
      }
    } catch (error) {
      console.error('Error deleting recording:', error)
      toast.error('Failed to delete recording')
    } finally {
      setDeleting(null)
    }
  }

  function getActionStats(actions: any[]) {
    const clicks = actions.filter(a => a.type === 'click').length
    const types = actions.filter(a => a.type === 'type').length
    const navigations = actions.filter(a => a.type === 'navigate').length
    
    return { clicks, types, navigations }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No recordings yet. Create your first recording above.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recordings List */}
      <div>
        <h4 className="text-sm font-medium mb-3">Recordings ({recordings.length})</h4>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {recordings.map((recording) => {
              const stats = getActionStats(recording.actions)
              const isSelected = selectedRecording?.id === recording.id
              
              return (
                <div
                  key={recording.id}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors
                    ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}
                  `}
                  onClick={() => setSelectedRecording(recording)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {recording.actions.length} steps
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(recording.recorded_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm truncate text-muted-foreground">
                        {recording.url}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          {stats.clicks}
                        </span>
                        <span className="flex items-center gap-1">
                          <Type className="h-3 w-3" />
                          {stats.types}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(recording.duration_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(recording.id)
                      }}
                      disabled={deleting === recording.id}
                    >
                      {deleting === recording.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Selected Recording Details */}
      {selectedRecording && (
        <>
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium mb-3">Recording Details</h4>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {selectedRecording.actions.length} Actions
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3" />
                      Duration: {(selectedRecording.duration_ms / 1000).toFixed(1)}s
                    </CardDescription>
                  </div>
                  
                  <Badge variant="outline">
                    {formatTimeAgo(selectedRecording.recorded_at)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* URL */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Starting URL</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm break-all">{selectedRecording.url}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      asChild
                    >
                      <a href={selectedRecording.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Action Summary */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Actions</p>
                  <ScrollArea className="h-[120px] border rounded-md p-3">
                    <div className="space-y-2">
                      {selectedRecording.actions.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-muted-foreground shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          
                          {action.type === 'click' && (
                            <div className="flex items-center gap-2">
                              <MousePointer className="h-3 w-3 text-blue-500" />
                              <span>Click: <code className="text-xs bg-muted px-1 rounded">{action.selector?.[0]?.value || 'element'}</code></span>
                            </div>
                          )}
                          
                          {action.type === 'type' && (
                            <div className="flex items-center gap-2">
                              <Type className="h-3 w-3 text-green-500" />
                              <span>Type: <code className="text-xs bg-muted px-1 rounded">{action.value}</code></span>
                            </div>
                          )}
                          
                          {action.type === 'navigate' && (
                            <div className="flex items-center gap-2">
                              <Navigation className="h-3 w-3 text-purple-500" />
                              <span className="truncate">Navigate: {action.url}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Viewport Info */}
                {selectedRecording.viewport && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Viewport</p>
                    <p className="text-sm">
                      {selectedRecording.viewport.width} × {selectedRecording.viewport.height}
                    </p>
                  </div>
                )}

                {/* Run Test Button */}
                <Button
                  onClick={() => onRunTest(selectedRecording)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Play className="h-4 w-4" />
                  Run This Recording
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}