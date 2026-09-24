// ============================================================
// Interactive User Guide / Feature Tour
// The "Life of the Site" Guide
// ============================================================

import { useState, useCallback } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useContentStore } from '@/store'
import brand from '@/lib/platforms'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Play,
  SkipForward,
  Sparkles,
  FolderOpen,
  CalendarDays,
  Plug,
  BarChart3,
  Robot,
  MessageSquare,
  Video,
  Image,
  Music,
  Upload,
  Send,
  CheckCircle2,
  Circle,
  ArrowRight,
  Lightbulb,
  Shield,
  Zap,
  Globe,
  Clock,
  Target,
  Key,
  Settings,
  Eye,
  PenTool,
  Link,
  Crown,
} from 'lucide-react'

interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  section: string
  action: string
  details: string[]
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the ETS Command Center',
    description: 'This is your all-in-one command center for End Time Soldiers media ministry. Everything you need to create, manage, and publish content is right here.',
    icon: <Crown className="h-6 w-6 text-gold" />,
    section: 'Introduction',
    action: 'Click "Start Tour" or "Next" to begin',
    details: ['You\'re about to see every feature of the system', 'Each step explains what to click and what happens', 'You can skip anytime and explore on your own']
  },
  {
    id: 'dashboard',
    title: 'Dashboard — Your Overview',
    description: 'When you first open the site, this is what you see. It shows your stats, upcoming posts, agent status, and AI insights at a glance.',
    icon: <Eye className="h-6 w-6 text-gold" />,
    section: 'Dashboard',
    action: 'Look at the stat cards and sidebar',
    details: [
      'Media Assets: Total files you\'ve uploaded',
      'Scheduled Posts: What\'s going live soon',
      'Connected Platforms: How many accounts are linked',
      'Engagement Rate: Your DA/BI analytics score',
      'AI Agents: How many are running',
      'The sidebar has 7 navigation items',
    ]
  },
  {
    id: 'sidebar',
    title: 'Sidebar Navigation',
    description: 'The left sidebar is your main navigation. Each icon takes you to a different part of the system.',
    icon: <Settings className="h-6 w-6 text-gold" />,
    section: 'Navigation',
    action: 'Click each icon in the sidebar to navigate',
    details: [
      '📊 Overview: Back to Dashboard',
      '📁 Media Library: Your uploaded videos and assets',
      '⚡ AI Studio: Generate content with AI',
      '📅 Calendar: View and schedule posts',
      '📊 DA/BI Analytics: Data analytics and insights',
      '🤖 Agents: Manage autonomous AI agents',
      '🔗 Connections: Link your social media accounts',
    ]
  },
  {
    id: 'library',
    title: 'Media Library — Your Content Vault',
    description: 'This is where you upload your videos, images, and audio. Once uploaded, the AI will automatically analyze them and find the best moments.',
    icon: <FolderOpen className="h-6 w-6 text-gold" />,
    section: 'Media Library',
    action: 'Click Upload Files and select a video',
    details: [
      'Click the 📤 Upload button to select files',
      'Supports video, images, and audio',
      'After uploading, AI will auto-analyze',
      'The AI finds Gospel, Teaching, Prayer, Worship moments',
      'Each video gets clips identified automatically',
      'Search bar helps you find specific content',
      'Stats show how many of each type you have',
    ]
  },
  {
    id: 'upload',
    title: 'How to Upload Content',
    description: 'Uploading your content is the first step. The AI needs raw material to work with.',
    icon: <Upload className="h-6 w-6 text-gold" />,
    section: 'Upload Process',
    action: 'Select a file and wait for processing',
    details: [
      'Click 📤 Upload Files to browse',
      'Select one or more files',
      'Click "Upload Now" to start',
      'The system will: Extract metadata → Transcribe → Analyze → Find clips',
      'Watch the progress indicator',
      'Once done, clips appear in the Studio',
    ]
  },
  {
    id: 'studio',
    title: 'AI Studio — The Magic Maker',
    description: 'This is where the AI transforms your content into platform-ready posts. Choose your idea, tone, and platforms, and watch the magic happen.',
    icon: <Sparkles className="h-6 w-6 text-gold" />,
    section: 'AI Studio',
    action: 'Type an idea and click Generate',
    details: [
      'Type your core idea or message in the text box',
      'Choose a tone: Bold & prophetic, Teaching, etc.',
      'Select your autonomy level (Assisted/Semi/Autonomous)',
      'Attach media from your library if desired',
      'Pick the platforms you want',
      'Click "Generate" and the AI creates content',
      'Each platform gets its own optimized version',
    ]
  },
  {
    id: 'autonomy',
    title: 'Autonomy Levels Explained',
    description: 'Choose how much control you give the AI. Three levels from full human control to complete autonomy.',
    icon: <Zap className="h-6 w-6 text-gold" />,
    section: 'Autonomy',
    action: 'Select your preferred autonomy level',
    details: [
      '🔵 Assisted: AI suggests, YOU approve every step',
      '🟡 Semi-Autonomous: AI proposes plans, you approve execution',
      '🟢 Full Autonomous: AI plans, executes, and self-reports',
      'Full autonomy is ideal for the Media Engine',
      'You can always change this per session',
    ]
  },
  {
    id: 'output',
    title: 'Reviewing Generated Content',
    description: 'After the AI generates content, you see each platform\'s version. Review, copy, or schedule them.',
    icon: <CheckCircle2 className="h-6 w-6 text-gold" />,
    section: 'Content Review',
    action: 'Click Copy or Schedule on each output',
    details: [
      'Each card shows the platform name and icon',
      'Review the title, body, hashtags, and CTA',
      'Click Copy to grab text to clipboard',
      'Click Schedule to add to the calendar as draft',
      'Confidence scores show AI certainty',
      'You can edit any text before publishing',
    ]
  },
  {
    id: 'calendar',
    title: 'Calendar — Your Publishing Schedule',
    description: 'The calendar shows all scheduled posts across platforms. It follows the 3-posts-per-day rhythm: 6AM, 12PM, 6PM.',
    icon: <CalendarDays className="h-6 w-6 text-gold" />,
    section: 'Calendar',
    action: 'Click on a day to see posts, use arrows to navigate months',
    details: [
      'Each cell shows scheduled posts for that day',
      'Click a day to see details',
      'Use arrows to navigate months',
      'Click "+ Add Post" to schedule manually',
      'Three time slots: 6AM (Scripture), 12PM (Teaching), 6PM (Gospel)',
      'Color-coded by status: idea, draft, approved, published',
      'Posts auto-schedule from the AI Studio',
    ]
  },
  {
    id: 'da',
    title: 'DA/BI Analytics — Data Intelligence',
    description: 'This is your data analytics command center. Track KPIs, see engagement trends, and get AI-generated insights.',
    icon: <BarChart3 className="h-6 w-6 text-gold" />,
    section: 'Analytics',
    action: 'Explore KPI cards and insights',
    details: [
      'KPI cards show total views, engagement rate, and more',
      'Engagement by Platform shows which platform performs best',
      'AI Insights panel shows automated findings',
      'Top Performing Content table ranks your best posts',
      'Trends are automatically detected',
      'All data updates in real-time',
    ]
  },
  {
    id: 'agents',
    title: 'Agents — Your Autonomous Team',
    description: 'These are AI agents that can work on autopilot. Each agent has a specific job and can run independently.',
    icon: <Robot className="h-6 w-6 text-gold" />,
    section: 'Agents',
    action: 'Click Run on any agent',
    details: [
      'Content Repurpose: Analyzes videos and creates posts',
      'Schedule Optimizer: Finds the best posting times',
      'Publish Dispatch: Auto-publishes approved content',
      'Analytics Scout: Monitors performance and finds trends',
      'Content Scout: Discovers new content opportunities',
      'Click Run to execute an agent manually',
      'Green pulsing dot means agent is currently running',
      'Autonomy level shown on each agent',
    ]
  },
  {
    id: 'connections',
    title: 'Connections — Link Your Platforms',
    description: 'Before the system can publish, you need to connect your social media accounts. Each platform needs its API credentials.',
    icon: <Plug className="h-6 w-6 text-gold" />,
    section: 'Connections',
    action: 'Click Connect on each platform',
    details: [
      'YouTube: Need API Key and OAuth credentials',
      'TikTok: Need Client Key and Access Token',
      'Instagram/Facebook: Need Meta App ID and Token',
      'X/Twitter: Need API Keys and Access Tokens',
      'LinkedIn: Need Client ID and Access Token',
      'Telegram: Need Bot Token from @BotFather',
      'All credentials are encrypted and stored securely',
      'Never share your credentials with anyone',
    ]
  },
  {
    id: 'publish',
    title: 'Publishing — From Scheduled to Live',
    description: 'When a post is scheduled and approved, the Publish Dispatch Agent automatically posts it to the platform.',
    icon: <Send className="h-6 w-6 text-gold" />,
    section: 'Publishing',
    action: 'Watch the Publish Agent in action',
    details: [
      'Posts go through: Idea → Draft → Review → Approve → Schedule',
      'Once scheduled, the Publish Agent handles it',
      'It posts via platform APIs at the scheduled time',
      'If publishing fails, it retries automatically',
      'Published posts get a URL recorded',
      'You can track everything in the calendar',
    ]
  },
  {
    id: 'tips',
    title: 'Pro Tips for Getting the Most',
    description: 'Here are the best practices to maximize your content output and engagement.',
    icon: <Lightbulb className="h-6 w-6 text-gold" />,
    section: 'Tips',
    action: 'Remember these best practices',
    details: [
      '📤 Upload videos regularly — more raw material = more content',
      '🎯 Use Full Autonomous mode for batch processing',
      '📅 Stick to 3 posts/day rhythm for consistency',
      '🔗 Connect all platforms to maximize reach',
      '📊 Check DA/BI weekly to optimize strategy',
      '🤖 Let agents run overnight for 24/7 operation',
      '✅ Always review content before approving',
      '⚔️ Keep the mission first: Raising Bold Believers',
    ]
  },
  {
    id: 'done',
    title: 'You\'re All Set! 🎉',
    description: 'You now know the entire system. Start uploading content, connecting platforms, and watch the AI agents work their magic. Your command center is ready.',
    icon: <Crown className="h-6 w-6 text-gold" />,
    section: 'Complete',
    action: 'Start using the system!',
    details: [
      'The Media Engine can run automatically',
      'Agents work 24/7 once connected',
      'Start with uploading your first video',
      'Then connect your social media accounts',
      'Remember: Truth → Christ → Edification → Reach → Kingdom Impact',
      'Link: https://linktr.ee/endtimesoldiers',
    ]
  },
]

export function Tour() {
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const { setVideos, setClips, setContent } = useContentStore()

  const step = TOUR_STEPS[stepIndex]
  const progress = ((stepIndex + 1) / TOUR_STEPS.length) * 100

  const nextStep = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      setOpen(false)
    }
  }, [stepIndex])

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1)
    }
  }, [stepIndex])

  const startTour = useCallback(() => {
    setStepIndex(0)
    setOpen(true)
  }, [])

  const skipTour = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <>
      {/* Tour Trigger Button */}
      <button
        onClick={startTour}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gold-gradient text-primary-foreground font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #B8962E)' }}
      >
        <Crown className="h-5 w-5" />
        Start Tour
      </button>

      {/* Tour Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={skipTour} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border bg-background shadow-2xl">
            
            {/* Header */}
            <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                {step.icon}
                <div>
                  <h2 className="font-display text-xl font-bold">{step.title}</h2>
                  <Badge variant="outline">{step.section}</Badge>
                </div>
              </div>
              <button onClick={skipTour} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Step {stepIndex + 1} of {TOUR_STEPS.length}</span>
                <span>{step.section}</span>
              </div>
              <Progress value={progress} />
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-lg leading-relaxed mb-4">{step.description}</p>
              
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ActionIcon section={step.section} />
                  <span className="font-semibold text-sm">What to do:</span>
                </div>
                <p className="text-sm text-muted-foreground">{step.action}</p>
              </div>

              <div className="space-y-2">
                {step.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                    <span className="text-sm">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="sticky bottom-0 bg-background border-t p-6 flex items-center justify-between rounded-b-2xl">
              <Button variant="ghost" onClick={stepIndex > 0 ? prevStep : skipTour}>
                {stepIndex === 0 ? 'Skip Tour' : <><ChevronLeft className="h-4 w-4 mr-1" /> Previous</>}
              </Button>
              
              <div className="flex gap-1">
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full transition-all cursor-pointer ${i === stepIndex ? 'bg-gold w-6' : 'bg-muted-foreground/30'}`}
                    onClick={() => setStepIndex(i)} />
                ))}
              </div>

              <Button onClick={nextStep} className="bg-gold-gradient text-primary-foreground">
                {stepIndex === TOUR_STEPS.length - 1 ? 'Done ✨' : 'Next' }
                {stepIndex < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  )
}

function ActionIcon({ section }: { section: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    'Introduction': <Circle className="h-4 w-4" />,
    'Navigation': <Settings className="h-4 w-4" />,
    'Dashboard': <Eye className="h-4 w-4" />,
    'Media Library': <FolderOpen className="h-4 w-4" />,
    'Upload Process': <Upload className="h-4 w-4" />,
    'AI Studio': <Sparkles className="h-4 w-4" />,
    'Autonomy': <Zap className="h-4 w-4" />,
    'Content Review': <CheckCircle2 className="h-4 w-4" />,
    'Calendar': <CalendarDays className="h-4 w-4" />,
    'Analytics': <BarChart3 className="h-4 w-4" />,
    'Agents': <Robot className="h-4 w-4" />,
    'Connections': <Plug className="h-4 w-4" />,
    'Publishing': <Send className="h-4 w-4" />,
    'Tips': <Lightbulb className="h-4 w-4" />,
    'Complete': <Crown className="h-4 w-4" />,
  }
  return iconMap[section] || <Circle className="h-4 w-4" />
}

// ============================================================
// Feature Tour Cards — Show on landing page
// ============================================================
export function FeatureTourCards() {
  const features = [
    { icon: <Upload className="h-8 w-8" />, title: 'Upload Media', desc: 'Upload videos, images, and audio. AI auto-analyzes everything.', color: 'from-blue-500 to-blue-700' },
    { icon: <Sparkles className="h-8 w-8" />, title: 'AI Studio', desc: 'Transform one idea into platform-optimized content for all channels.', color: 'from-gold to-yellow-600' },
    { icon: <CalendarDays className="h-8 w-8" />, title: 'Smart Calendar', desc: '3 posts/day at 6AM, 12PM, 6PM. Never miss a time slot.', color: 'from-green-500 to-green-700' },
    { icon: <Robot className="h-8 w-8" />, title: 'Autonomous Agents', desc: 'AI agents work 24/7 to repurpose, schedule, publish, and analyze.', color: 'from-purple-500 to-purple-700' },
    { icon: <BarChart3 className="h-8 w-8" />, title: 'DA/BI Analytics', desc: 'Track KPIs, engagement, trends, and get AI-powered insights.', color: 'from-red-500 to-red-700' },
    { icon: <Plug className="h-8 w-8" />, title: 'Platform Connections', desc: 'Link YouTube, TikTok, Instagram, Facebook, X, Threads, LinkedIn, Telegram.', color: 'from-cyan-500 to-cyan-700' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {features.map((feature, i) => (
        <div key={i} className="card group hover:gold-ring transition-all cursor-pointer">
          <div className={`h-16 w-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
            {feature.icon}
          </div>
          <h3 className="font-display text-lg font-bold mb-2">{feature.title}</h3>
          <p className="text-sm text-muted-foreground">{feature.desc}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Landing Page Component
// ============================================================
export function LandingPage() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
          <div className="mb-6">
            <span className="text-6xl">⚔️</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-gold mb-4">
            End Time Soldiers
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-2">
            Raising Bold Believers ⚔️
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            AI-Powered Media Command Center
          </p>
          
          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Sign in to access your command center</p>
              <Button className="bg-gold-gradient text-primary-foreground text-lg px-8 py-4" onClick={() => window.location.href = '/auth'}>
                <Key className="h-5 w-5 mr-2" /> Sign In
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gold font-semibold">Welcome back, Soldier 👋</p>
              <Button className="bg-gold-gradient text-primary-foreground text-lg px-8 py-4" onClick={() => window.location.href = '/dashboard'}>
                <Crown className="h-5 w-5 mr-2" /> Open Command Center
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="font-display text-3xl font-bold text-gold text-center mb-4">Everything You Need</h2>
        <p className="text-muted-foreground text-center mb-12">One platform to rule them all</p>
        <FeatureTourCards />
      </div>

      {/* How It Works */}
      <div className="bg-obsidian-light border-t border-border/60 py-16">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="font-display text-3xl font-bold text-gold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Upload', desc: 'Drop your videos, images, or audio into the Media Library', icon: <Upload className="h-12 w-12" /> },
              { step: '2', title: 'AI Creates', desc: 'The AI analyzes, identifies moments, and generates platform content', icon: <Sparkles className="h-12 w-12" /> },
              { step: '3', title: 'Publish & Grow', desc: 'Content gets scheduled, published, and tracked across all platforms', icon: <Globe className="h-12 w-12" /> },
            ].map((item, i) => (
              <div key={i} className="text-center card p-8">
                <div className="h-20 w-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4 text-gold">
                  {item.icon}
                </div>
                <div className="text-xs text-gold font-bold tracking-wider mb-2">STEP {item.step}</div>
                <h3 className="font-display text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-8 text-center border-t border-border/60">
        <p className="text-muted-foreground text-sm mb-4">
          🔒 Secure · 🎯 Accurate · ⚔️ Kingdom-Focused · 📊 Analytics-Driven
        </p>
        <p className="text-xs text-muted-foreground">
          End Time Soldiers | Raising Bold Believers ⚔️ | https://linktr.ee/endtimesoldiers
        </p>
      </div>
    </div>
  )
}
