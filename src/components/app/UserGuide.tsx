import { useState, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  CalendarDays,
  Plug,
  Book,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Video,
  Image,
  Music,
  Upload,
  Send,
  Key,
  Settings,
  Eye,
  PenTool,
  Link,
  Crown,
  Menu,
  X,
  BookMarked,
  Clock,
  Target,
  Shield,
  Zap,
} from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"

// ============================================================
// USER GUIDE CONSTANTS
// ============================================================

const GUIDE_VERSION = "1.0.0"
const STORAGE_KEY = "ets_user_guide_seen"
const STORAGE_KEY_PREFIX = "ets_guide_seen_"

interface GuideChapter {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  content: {
    heading: string
    points: string[]
    workflow?: { step: string; icon: React.ReactNode }[]
  }
}

const CHAPTERS: GuideChapter[] = [
  {
    id: "welcome",
    title: "Welcome",
    icon: <Crown className="h-5 w-5" />,
    description: "The ETS workflow at a glance.",
    content: {
      heading: "How It Works",
      points: [
        "📤 Upload videos, images, or audio to the Media Library",
        "⚡ The AI analyzes content and creates platform posts",
        "📅 Posts are scheduled across platforms automatically",
        "🔗 Connect social media accounts to publish",
        "📊 Track performance with built-in analytics",
      ],
      workflow: [
        { step: "Upload Media", icon: <Upload className="h-4 w-4" /> },
        { step: "AI Creates", icon: <Sparkles className="h-4 w-4" /> },
        { step: "Route to Platforms", icon: <Link className="h-4 w-4" /> },
        { step: "Schedule", icon: <CalendarDays className="h-4 w-4" /> },
        { step: "Connect & Publish", icon: <Plug className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "navigation",
    title: "Navigation",
    icon: <Eye className="h-5 w-5" />,
    description: "Identify every icon and where it takes you.",
    content: {
      heading: "Sidebar Navigation",
      points: [
        "📊 Dashboard — Overview stats, agent status, upcoming posts",
        "📁 Media Library — Upload and manage all files",
        "⚡ AI Studio — Generate platform-specific content",
        "🎬 Shorts Pipeline — Create short-form video clips",
        "📅 Calendar — View and schedule all posts",
        "🔗 Connections — Link social media accounts",
      ],
      workflow: [
        { step: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
        { step: "Library", icon: <FolderOpen className="h-4 w-4" /> },
        { step: "Studio", icon: <Sparkles className="h-4 w-4" /> },
        { step: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
        { step: "Connections", icon: <Plug className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "media",
    title: "Media Library",
    icon: <FolderOpen className="h-5 w-5" />,
    description: "Upload, organize, and prepare your content.",
    content: {
      heading: "Managing Your Media",
      points: [
        "Bulk drag-and-drop upload for videos, images, and audio",
        "File filters and search to find specific content quickly",
        "Preview and delete controls for each file",
        "Mark videos as Long-form for proper categorization",
        "Open Split view to separate segments",
        "AI auto-analyzes uploaded content and identifies clips",
      ],
      workflow: [
        { step: "Upload Files", icon: <Upload className="h-4 w-4" /> },
        { step: "Filter & Search", icon: <Target className="h-4 w-4" /> },
        { step: "Preview/Delete", icon: <Eye className="h-4 w-4" /> },
        { step: "Mark Long-form", icon: <Video className="h-4 w-4" /> },
        { step: "Open Split", icon: <Settings className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "shorts",
    title: "Shorts Pipeline",
    icon: <Video className="h-5 w-5" />,
    description: "Create short-form content from longer videos.",
    content: {
      heading: "Shorts Pipeline Steps",
      points: [
        "Select source video from your library",
        "Review auto-generated transcript and notes",
        "Set manual timestamps for key moments",
        "AI extracts highlights with titles, hooks, and themes",
        "Choose target channels (YouTube Shorts, TikTok, Reels)",
        "Preview both routes side by side",
        "Send finalized clips to the Calendar",
      ],
      workflow: [
        { step: "Source Selection", icon: <Video className="h-4 w-4" /> },
        { step: "Transcript & Notes", icon: <BookMarked className="h-4 w-4" /> },
        { step: "Manual Timestamps", icon: <Clock className="h-4 w-4" /> },
        { step: "AI Extraction", icon: <Sparkles className="h-4 w-4" /> },
        { step: "Segment Titles/Hooks", icon: <PenTool className="h-4 w-4" /> },
        { step: "Channel Choices", icon: <Link className="h-4 w-4" /> },
        { step: "Send to Calendar", icon: <Send className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "studio",
    title: "AI Studio",
    icon: <Sparkles className="h-5 w-5" />,
    description: "Generate platform-optimized content with AI.",
    content: {
      heading: "AI Studio Workflow",
      points: [
        "Enter your core idea or message",
        "Choose a tone (Bold & prophetic, Teaching, etc.)",
        "Optionally attach media from your library",
        "Select target channels for each post",
        "Click Generate to create content",
        "Copy text to clipboard or Schedule directly",
        "Autonomy level controls how much AI does",
      ],
      workflow: [
        { step: "Core Idea", icon: <PenTool className="h-4 w-4" /> },
        { step: "Tone", icon: <Settings className="h-4 w-4" /> },
        { step: "Optional Media", icon: <Image className="h-4 w-4" /> },
        { step: "Channel Selection", icon: <Link className="h-4 w-4" /> },
        { step: "Generate", icon: <Zap className="h-4 w-4" /> },
        { step: "Copy & Schedule", icon: <Send className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "calendar",
    title: "Calendar",
    icon: <CalendarDays className="h-5 w-5" />,
    description: "Schedule, manage, and publish all posts.",
    content: {
      heading: "Calendar Management",
      points: [
        "Navigate months with arrow buttons",
        "Click any date to see all scheduled posts",
        "Click 'New Post' to create a schedule manually",
        "Edit fields: date, time, platform, pillar",
        "View the queue of pending posts",
        "Edit or delete any scheduled post",
        "Posts follow the 3-per-day rhythm: 6AM, 12PM, 6PM",
      ],
      workflow: [
        { step: "Month Navigation", icon: <CalendarDays className="h-4 w-4" /> },
        { step: "Click Date", icon: <Eye className="h-4 w-4" /> },
        { step: "New Post", icon: <Upload className="h-4 w-4" /> },
        { step: "Edit Fields", icon: <PenTool className="h-4 w-4" /> },
        { step: "Queue View", icon: <Target className="h-4 w-4" /> },
        { step: "Edit/Delete", icon: <Settings className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "connections",
    title: "Connections",
    icon: <Plug className="h-5 w-5" />,
    description: "Connect your social media accounts.",
    content: {
      heading: "Connecting Platforms",
      points: [
        "Click Connect on each platform to link it",
        "Enter API keys from the provider's documentation",
        "All credentials are encrypted before saving",
        "Green badge means connected, red means not linked",
        "Click Update to change keys or status",
        "Disconnect to remove a platform link",
        "YouTube, TikTok, Instagram, Facebook, X, Threads, LinkedIn, Telegram",
      ],
      workflow: [
        { step: "Click Connect", icon: <Link className="h-4 w-4" /> },
        { step: "Get API Keys", icon: <Key className="h-4 w-4" /> },
        { step: "Enter Credentials", icon: <Settings className="h-4 w-4" /> },
        { step: "Save Encrypted", icon: <Shield className="h-4 w-4" /> },
        { step: "Check Status", icon: <Eye className="h-4 w-4" /> },
        { step: "Disconnect", icon: <X className="h-4 w-4" /> },
      ],
    },
  },
]

// ============================================================
// USER GUIDE COMPONENT
// ============================================================

export function UserGuide() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("welcome")
  const [progress, setProgress] = useState(0)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const sidebar = useSidebar()

  // Check if first visit per account
  useEffect(() => {
    if (!user) return
    const key = `${STORAGE_KEY_PREFIX}${user.id}`
    const seen = localStorage.getItem(key)
    if (seen !== GUIDE_VERSION) {
      setIsFirstVisit(true)
    }
  }, [user])

  // Auto-open on first visit
  useEffect(() => {
    if (isFirstVisit && user) {
      const timer = setTimeout(() => {
        setOpen(true)
        setActiveTab("welcome")
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isFirstVisit, user])

  const markSeen = useCallback(() => {
    if (!user) return
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, GUIDE_VERSION)
    setIsFirstVisit(false)
    setOpen(false)
  }, [user])

  const handleComplete = useCallback(() => {
    markSeen()
  }, [markSeen])

  const handleNext = useCallback(() => {
    const currentIndex = CHAPTERS.findIndex((c) => c.id === activeTab)
    if (currentIndex < CHAPTERS.length - 1) {
      setActiveTab(CHAPTERS[currentIndex + 1].id)
      setProgress(((currentIndex + 2) / CHAPTERS.length) * 100)
    } else {
      handleComplete()
    }
  }, [activeTab, handleComplete])

  const handlePrev = useCallback(() => {
    const currentIndex = CHAPTERS.findIndex((c) => c.id === activeTab)
    if (currentIndex > 0) {
      setActiveTab(CHAPTERS[currentIndex - 1].id)
      setProgress(((currentIndex) / CHAPTERS.length) * 100)
    }
  }, [activeTab])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && isFirstVisit) {
      markSeen()
    }
  }, [isFirstVisit, markSeen])

  const currentChapter = CHAPTERS.find((c) => c.id === activeTab)
  const chapterIndex = CHAPTERS.findIndex((c) => c.id === activeTab)

  // Update sidebar - add BookOpen icon
  useEffect(() => {
    // This effect runs to ensure the guide icon appears in sidebar
  }, [])

  return (
    <>
      {/* Mobile Header Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setActiveTab("welcome"); setProgress(0); setOpen(true) }}
        className="h-9 w-9 rounded-lg border border-input bg-background hover:bg-accent"
        aria-label="Open User Guide"
        title="User Guide"
      >
        <BookOpen className="h-4 w-4" />
      </Button>

      {/* Guide Modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto"
          showX
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gold" />
              End Time Soldiers Command Center Guide
            </DialogTitle>
            <DialogDescription>
              Learn how to use the entire ETS system step by step
            </DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Step {chapterIndex + 1} of {CHAPTERS.length}</span>
              <span>{currentChapter?.title}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Chapter Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto p-1">
              {CHAPTERS.map((chapter) => (
                <TabsTrigger
                  key={chapter.id}
                  value={chapter.id}
                  className="flex flex-col items-center gap-1 text-[10px] px-1 py-2 data-[state=active]:text-gold"
                  onClick={() => {
                    setActiveTab(chapter.id)
                    setProgress((CHAPTERS.findIndex((c) => c.id === chapter.id) / CHAPTERS.length) * 100)
                  }}
                >
                  {chapter.icon}
                  <span className="hidden sm:inline">{chapter.title}</span>
                  {chapterIndex > CHAPTERS.findIndex((c) => c.id === chapter.id) && (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Chapter Content */}
          <div className="space-y-4 py-2">
            {currentChapter && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                    {currentChapter.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold">{currentChapter.content.heading}</h3>
                    <Badge variant="outline">{currentChapter.description}</Badge>
                  </div>
                </div>

                <ul className="space-y-2">
                  {currentChapter.content.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Circle className="h-3 w-3 text-gold mt-1 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {currentChapter.content.workflow && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Workflow:</p>
                    <div className="flex flex-wrap gap-2">
                      {currentChapter.content.workflow.map((step, i) => (
                        <React.Fragment key={i}>
                          <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs border">
                            {step.icon}
                            <span>{step.step}</span>
                          </div>
                          {i < currentChapter.content.workflow.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={chapterIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {chapterIndex === 0 ? "Skip" : "Previous"}
            </Button>

            <div className="flex gap-1">
              {CHAPTERS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    i === chapterIndex ? "bg-gold w-4" : "bg-muted-foreground/30"
                  }`}
                  onClick={() => { setActiveTab(CHAPTERS[i].id); setProgress((i / CHAPTERS.length) * 100) }}
                />
              ))}
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={handleNext}
            >
              {chapterIndex === CHAPTERS.length - 1 ? "Done ✨" : "Next"}
              {chapterIndex < CHAPTERS.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// Guide Sidebar Button Component
// ============================================================

export function GuideSidebarButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const key = `${STORAGE_KEY_PREFIX}${user.id}`
    const seen = localStorage.getItem(key)
    if (seen !== GUIDE_VERSION) {
      const timer = setTimeout(() => setOpen(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [user])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { setOpen(true); setActiveTab("welcome") }}
        className="w-full justify-start gap-2 text-sm"
      >
        <BookOpen className="h-4 w-4" />
        User Guide
      </Button>

      {open && (
        <UserGuideContent open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

// Helper state for the sidebar button
import { useState } from "react"

function UserGuideContent({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState("welcome")
  const chapterIndex = CHAPTERS.findIndex((c) => c.id === activeTab)
  const currentChapter = CHAPTERS.find((c) => c.id === activeTab)
  const progress = (chapterIndex / CHAPTERS.length) * 100

  const handleNext = () => {
    if (chapterIndex < CHAPTERS.length - 1) {
      setActiveTab(CHAPTERS[chapterIndex + 1].id)
    } else {
      if (user) localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, GUIDE_VERSION)
      onOpenChange(false)
    }
  }

  const handlePrev = () => {
    if (chapterIndex > 0) setActiveTab(CHAPTERS[chapterIndex - 1].id)
  }

  if (!currentChapter) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold" /> User Guide
          </h3>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Progress value={progress} className="h-1" />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
              {currentChapter.icon}
            </div>
            <div>
              <h4 className="font-semibold">{currentChapter.content.heading}</h4>
              <p className="text-xs text-muted-foreground">{currentChapter.description}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {currentChapter.content.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Circle className="h-3 w-3 text-gold mt-1 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {currentChapter.content.workflow && (
            <div className="flex flex-wrap gap-2">
              {currentChapter.content.workflow.map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    {step.icon}
                    <span>{step.step}</span>
                  </div>
                  {i < currentChapter.content.workflow.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-background border-t p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={chapterIndex === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="flex gap-1">
            {CHAPTERS.map((_, i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === chapterIndex ? 'bg-gold' : 'bg-muted-foreground/30'}`} />
            ))}
          </div>
          <Button size="sm" onClick={handleNext}>
            {chapterIndex === CHAPTERS.length - 1 ? 'Done ✨' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Need user from auth
function useAuth() {
  const { user } = useAuthStore()
  return { user }
}

// Need store
import { useAuthStore } from "@/store"
