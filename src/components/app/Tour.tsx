import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector of the element to spotlight */
  target: string;
  /** Route to navigate to before showing this step */
  route?: string;
  /** Position of the tooltip relative to the target */
  placement?: "top" | "bottom" | "left" | "right";
  /** Text for the primary action */
  actionLabel?: string;
};

const TOUR_KEY = "ets-tour-done-v1";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "upload",
    title: "Step 1 — Upload your media",
    body: "Click this button to upload videos, images, or audio. For big files (1GB+), drop them in the media-inbox folder on your computer instead.",
    target: "button:has-text('Upload files')",
    route: "/library",
    placement: "bottom",
    actionLabel: "Try it: upload a file",
  },
  {
    id: "analyze",
    title: "Step 2 — Let the AI watch it",
    body: "Hover any media card and click this magnifier. The AI watches the video or reads the image and writes what it actually saw.",
    target: "button[aria-label*='Analyze']",
    route: "/library",
    placement: "top",
    actionLabel: "Try it: analyze a card",
  },
  {
    id: "shorts-source",
    title: "Step 3 — Open Shorts & pick a source",
    body: "This is the Shorts Pipeline. Pick a library video or an inbox file, choose your clip length, then detect highlights.",
    target: "text=Source: inbox file",
    route: "/shorts",
    placement: "bottom",
    actionLabel: "Try it: pick a file",
  },
  {
    id: "detect",
    title: "Step 4 — Detect highlights",
    body: "Press this button. The AI watches your video in sections and finds the most exciting moments with real timestamps.",
    target: "button:has-text('Detect highlights')",
    route: "/shorts",
    placement: "top",
    actionLabel: "Try it: detect moments",
  },
  {
    id: "cut",
    title: "Step 5 — Cut clips + write captions",
    body: "Untick any moment you don't want, then press this. Each moment becomes a vertical clip with thumbnail, captions, and hashtags.",
    target: "button:has-text('Cut clips')",
    route: "/shorts",
    placement: "top",
    actionLabel: "Try it: cut a clip",
  },
  {
    id: "preview",
    title: "Step 6 — Preview in Calendar",
    body: "Your drafts queue here automatically. Hover any draft to see its thumbnail, then click the eye to play the video.",
    target: "text=Queue",
    route: "/calendar",
    placement: "bottom",
    actionLabel: "Try it: preview a draft",
  },
  {
    id: "connect",
    title: "Step 7 — Connect & post",
    body: "Connect Telegram here (bot token from @BotFather). Then press Post on any draft — it goes live instantly.",
    target: "text=Platform Connections",
    route: "/connections",
    placement: "bottom",
    actionLabel: "Try it: connect a platform",
  },
];

export function Tour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;
    if (step.route) {
      navigate({ to: step.route as never });
    }
    const t = setTimeout(measure, 600);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, navigate, measure]);

  const next = () => {
    if (isLast) {
      setOpen(false);
      try {
        localStorage.setItem(TOUR_KEY, "1");
      } catch {
        // ignore
      }
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const back = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!open || !step) return null;

  const placement = step.placement ?? "bottom";
  const tooltipStyle = getTooltipStyle(targetRect, placement);

  return createPortal(
    <>
      {/* Dark overlay with cutout */}
      <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px]" onClick={dismiss} />

      {/* Spotlight ring around target */}
      {targetRect && (
        <div
          className="fixed z-[91] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-black transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[92] w-full max-w-sm rounded-2xl border border-primary/40 bg-background p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={back}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <Button
            onClick={next}
            size="sm"
            className="bg-gold-gradient text-primary-foreground hover:opacity-90"
          >
            {isLast ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                {step.actionLabel ?? "Next"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function getTooltipStyle(
  rect: DOMRect | null,
  placement: "top" | "bottom" | "left" | "right",
): React.CSSProperties {
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (placement) {
    case "bottom":
      return {
        top: Math.min(rect.bottom + gap, vh - 280),
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - 176, vw - 368)),
      };
    case "top":
      return {
        bottom: Math.min(vh - rect.top + gap, vh - 280),
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - 176, vw - 368)),
      };
    case "left":
      return {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 100, vh - 240)),
        right: Math.min(vw - rect.left + gap, vw - 368),
      };
    case "right":
      return {
        top: Math.max(16, Math.min(rect.top + rect.height / 2 - 100, vh - 240)),
        left: Math.min(rect.right + gap, vw - 368),
      };
  }
}

/** Floating button to reopen the tour */
export function TourButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowRight className="h-4 w-4" />
        Tour
      </Button>
      {open && <TourOverlay onDone={() => setOpen(false)} />}
    </>
  );
}

function TourOverlay({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    setTargetRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    if (step?.route) navigate({ to: step.route as never });
    const t = setTimeout(measure, 600);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, navigate, measure]);

  if (!step) return null;

  const placement = step.placement ?? "bottom";
  const tooltipStyle = getTooltipStyle(targetRect, placement);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px]" onClick={onDone} />
      {targetRect && (
        <div
          className="fixed z-[91] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-black transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}
      <div
        className="fixed z-[92] w-full max-w-sm rounded-2xl border border-primary/40 bg-background p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <button onClick={onDone} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="Close tour">
          <X className="h-4 w-4" />
        </button>
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => stepIndex > 0 && setStepIndex((i) => i - 1)}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
            ))}
          </div>
          <Button
            onClick={() => {
              if (isLast) {
                onDone();
                try {
                  localStorage.setItem(TOUR_KEY, "1");
                } catch {
                  // ignore
                }
              } else {
                setStepIndex((i) => i + 1);
              }
            }}
            size="sm"
            className="bg-gold-gradient text-primary-foreground hover:opacity-90"
          >
            {isLast ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                {step.actionLabel ?? "Next"} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
