import { Link, useRouterState } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"
import {
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  CalendarDays,
  Plug,
  LogOut,
  Menu,
  X,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { EtsWordmark, ETS_COVER_URL } from "@/components/brand/Brand"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserGuide } from "@/components/app/UserGuide"

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/library", label: "Media Library", icon: FolderOpen },
  { to: "/studio", label: "AI Studio", icon: Sparkles },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/connections", label: "Connections", icon: Plug },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const displayName =
    (user?.user_metadata?.["display_name"] as string | undefined) ||
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Soldier"

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-sidebar-accent text-primary shadow-[inset_2px_0_0_0_var(--primary)]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-primary")} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/dashboard" onClick={() => setOpen(false)}>
          <EtsWordmark />
        </Link>
        <button className="lg:hidden text-muted-foreground" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-5 mb-4 h-px bg-gradient-to-r from-primary/50 via-primary/10 to-transparent" />
      {nav}
      <div className="mx-3 mb-3 overflow-hidden rounded-lg border border-border/60">
        <div
          className="h-16 bg-cover bg-center"
          style={{ backgroundImage: `url(${ETS_COVER_URL})` }}
          role="img"
          aria-label="End Time Soldiers cover"
        />
        <p className="px-3 py-2 font-display text-[9px] leading-relaxed tracking-[0.18em] text-muted-foreground">
          RAISING A KINGDOM ARMY FOR SUCH A TIME AS THIS
        </p>
      </div>
      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4">
        <Avatar className="h-9 w-9 ring-1 ring-primary/40">
          <AvatarFallback className="bg-accent text-accent-foreground font-display text-xs">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      {/* User Guide Button near bottom of sidebar */}
      <div className="mt-auto px-3 pb-3">
        <UserGuideSidebarButton />
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <EtsWordmark compact />
          <span className="font-display text-sm tracking-[0.2em] text-gold-gradient">ETS</span>
          {/* Mobile User Guide Button */}
          <div className="ml-auto">
            <UserGuideMobileButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}

function UserGuideSidebarButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-gold">
        <BookOpen className="h-4 w-4" />
        User Guide
      </Button>
      {open && <UserGuideDialog open={open} onOpenChange={setOpen} />}
    </>
  )
}

function UserGuideMobileButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-8 w-8" aria-label="Open User Guide" title="User Guide">
        <BookOpen className="h-4 w-4" />
      </Button>
      {open && <UserGuideDialog open={open} onOpenChange={setOpen} />}
    </>
  )
}

function UserGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState("welcome")
  const chapterIndex = CHAPTERS_MAP.findIndex((c) => c.id === activeTab)
  const currentChapter = CHAPTERS_MAP.find((c) => c.id === activeTab)
  const progress = (chapterIndex / CHAPTERS_MAP.length) * 100

  const handleNext = () => {
    if (chapterIndex < CHAPTERS_MAP.length - 1) {
      setActiveTab(CHAPTERS_MAP[chapterIndex + 1].id)
    } else {
      onOpenChange(false)
    }
  }

  const handlePrev = () => {
    if (chapterIndex > 0) setActiveTab(CHAPTERS_MAP[chapterIndex - 1].id)
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
            {CHAPTERS_MAP.map((_, i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full cursor-pointer ${i === chapterIndex ? 'bg-gold' : 'bg-muted-foreground/30'}`} onClick={() => setActiveTab(CHAPTERS_MAP[i].id)} />
            ))}
          </div>
          <Button size="sm" onClick={handleNext}>
            {chapterIndex === CHAPTERS_MAP.length - 1 ? 'Done ✨' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// GUIDE DATA (inline to avoid import issues)
// ============================================================

import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen, Crown, Eye, FolderOpen, Sparkles, Video, CalendarDays,
  Plug, Link, ArrowRight, ArrowLeft, CheckCircle2, Circle,
  Upload, Send, Key, Settings, Shield, Zap, Target, Clock,
  BookMarked, PenTool, Image, X, Menu,
} from "lucide-react"

const CHAPTERS_MAP = [
  {
    id: "welcome", title: "Welcome", icon: <Crown className="h-5 w-5" />,
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
        { step: "Upload", icon: <Upload className="h-4 w-4" /> },
        { step: "AI Creates", icon: <Sparkles className="h-4 w-4" /> },
        { step: "Route", icon: <Link className="h-4 w-4" /> },
        { step: "Schedule", icon: <CalendarDays className="h-4 w-4" /> },
        { step: "Connect & Publish", icon: <Plug className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "navigation", title: "Navigation", icon: <Eye className="h-5 w-5" />,
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
    id: "media", title: "Media Library", icon: <FolderOpen className="h-5 w-5" />,
    description: "Upload, organize, and prepare your content.",
    content: {
      heading: "Managing Your Media",
      points: [
        "Bulk drag-and-drop upload for videos, images, and audio",
        "File filters and search to find specific content quickly",
        "Preview and delete controls for each file",
        "Mark videos as Long-form for proper categorization",
        "Open Split view to separate segments",
      ],
      workflow: [
        { step: "Upload", icon: <Upload className="h-4 w-4" /> },
        { step: "Filter", icon: <Target className="h-4 w-4" /> },
        { step: "Preview", icon: <Eye className="h-4 w-4" /> },
        { step: "Long-form", icon: <Video className="h-4 w-4" /> },
        { step: "Split", icon: <Settings className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "shorts", title: "Shorts Pipeline", icon: <Video className="h-5 w-5" />,
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
        { step: "Source", icon: <Video className="h-4 w-4" /> },
        { step: "Transcript", icon: <BookMarked className="h-4 w-4" /> },
        { step: "Timestamps", icon: <Clock className="h-4 w-4" /> },
        { step: "AI Extract", icon: <Sparkles className="h-4 w-4" /> },
        { step: "Titles/Hooks", icon: <PenTool className="h-4 w-4" /> },
        { step: "Channels", icon: <Link className="h-4 w-4" /> },
        { step: "Send", icon: <Send className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "studio", title: "AI Studio", icon: <Sparkles className="h-5 w-5" />,
    description: "Generate platform-optimized content with AI.",
    content: {
      heading: "AI Studio Workflow",
      points: [
        "Enter your core idea or message",
        "Choose a tone (Bold & prophetic, Teaching, etc.)",
        "Optionally attach media from your library",
        "Select target channels for each post",
        "Click Generate to create content",
        "Copy text or Schedule directly",
        "Autonomy level controls how much AI does",
      ],
      workflow: [
        { step: "Idea", icon: <PenTool className="h-4 w-4" /> },
        { step: "Tone", icon: <Settings className="h-4 w-4" /> },
        { step: "Media", icon: <Image className="h-4 w-4" /> },
        { step: "Channels", icon: <Link className="h-4 w-4" /> },
        { step: "Generate", icon: <Zap className="h-4 w-4" /> },
        { step: "Copy & Schedule", icon: <Send className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "calendar", title: "Calendar", icon: <CalendarDays className="h-5 w-5" />,
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
        { step: "Navigate", icon: <CalendarDays className="h-4 w-4" /> },
        { step: "Click Date", icon: <Eye className="h-4 w-4" /> },
        { step: "New Post", icon: <Upload className="h-4 w-4" /> },
        { step: "Edit", icon: <PenTool className="h-4 w-4" /> },
        { step: "Queue", icon: <Target className="h-4 w-4" /> },
        { step: "Delete", icon: <Settings className="h-4 w-4" /> },
      ],
    },
  },
  {
    id: "connections", title: "Connections", icon: <Plug className="h-5 w-5" />,
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
      ],
      workflow: [
        { step: "Connect", icon: <Link className="h-4 w-4" /> },
        { step: "Get Keys", icon: <Key className="h-4 w-4" /> },
        { step: "Enter Credentials", icon: <Settings className="h-4 w-4" /> },
        { step: "Save Encrypted", icon: <Shield className="h-4 w-4" /> },
        { step: "Status", icon: <Eye className="h-4 w-4" /> },
        { step: "Disconnect", icon: <X className="h-4 w-4" /> },
      ],
    },
  },
]

export { AppShell }
