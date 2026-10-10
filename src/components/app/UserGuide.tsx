import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles, Upload, Scissors, Eye, Calendar, Send, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    title: "Welcome to ETS Command Center",
    body: "This studio turns one long video into ready-to-post clips for every platform. This quick tour shows you the 7 steps. It takes 2 minutes.",
    icon: Sparkles,
  },
  {
    title: "Step 1 — Upload your media",
    body: "Go to Media Library. Click Upload files or drag videos/images onto the drop zone. Big videos (1GB+) go in the media-inbox folder on your computer instead — the Shorts page reads them from disk.",
    icon: Upload,
    tip: "Library → Upload files button",
  },
  {
    title: "Step 2 — Let the AI watch it",
    body: "Hover any media card and click the magnifier (Analyze). The AI watches the video or reads the image and writes what it actually saw. That summary is saved on the card.",
    icon: Eye,
    tip: "Library → hover card → magnifier button",
  },
  {
    title: "Step 3 — Split into clips",
    body: "Open Shorts (sidebar). Pick your video, choose clip length and Vertical 9:16, then press 1 · Detect highlights. The AI finds the most exciting moments across the whole video.",
    icon: Scissors,
    tip: "Shorts → pick source → 1 · Detect highlights",
  },
  {
    title: "Step 4 — Cut + write captions",
    body: "Untick any moment you don't want, then press 2 · Cut clips + write captions. Each moment becomes its own clip with a thumbnail, captions, and hashtags — saved to your Library and queued as drafts in the Calendar.",
    icon: CheckCircle2,
    tip: "Shorts → 2 · Cut clips + write captions",
  },
  {
    title: "Step 5 — Preview your clips",
    body: "Open Calendar. Hover any queued draft to see its thumbnail. Click the eye icon to play the video and read the caption before posting.",
    icon: Eye,
    tip: "Calendar → hover draft → eye icon",
  },
  {
    title: "Step 6 — Schedule",
    body: "Drafts are auto-queued on the Calendar, staggered one per day at 6 PM. Click any day to add a post manually, or Edit a draft to change text, time, or platform.",
    icon: Calendar,
    tip: "Calendar → click a day or Edit on a draft",
  },
  {
    title: "Step 7 — Post with one click",
    body: "Connect your platforms in Connections (Telegram works out of the box — add a bot token from @BotFather). Then press Post on any draft or Studio card. Telegram posts instantly; other platforms need their own developer keys.",
    icon: Send,
    tip: "Connections → connect → Calendar/Studio → Post",
  },
];

export function UserGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const Icon = current.icon;
  const last = step === STEPS.length - 1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-primary/30 bg-background p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Close guide">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient text-primary-foreground">
          <Icon className="h-6 w-6" />
        </div>

        <p className="font-display text-[11px] uppercase tracking-[0.3em] text-primary">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold">{current.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{current.body}</p>

        {current.tip && (
          <p className="mt-4 rounded-lg border border-primary/30 bg-accent/40 px-3 py-2 text-xs text-primary">
            💡 {current.tip}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
            ))}
          </div>
          {last ? (
            <Button onClick={onClose} className="bg-gold-gradient text-primary-foreground hover:opacity-90">
              Start creating <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} variant="outline">
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
