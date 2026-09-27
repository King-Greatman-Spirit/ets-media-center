// Brand assets served locally from /public (no cloud dependency).
export const ETS_LOGO_URL = "/favicon.png";
export const ETS_COVER_URL = "/favicon.png";

import { cn } from "@/lib/utils";

export function EtsLogo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <img
      src={ETS_LOGO_URL}
      alt="End Time Soldiers shield"
      width={size}
      height={size}
      className={cn("rounded-lg object-cover ring-1 ring-primary/40 shadow-[0_0_24px_-6px_var(--primary)]", className)}
      loading="eager"
    />
  );
}

export function EtsWordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <EtsLogo size={compact ? 36 : 44} />
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-[0.18em] text-gold-gradient">ETS</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Command Center</div>
        </div>
      )}
    </div>
  );
}

export function EtsCover({ className, overlay = true }: { className?: string; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_72%)]",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(135deg,transparent_0_14px,color-mix(in_oklab,var(--primary)_7%,transparent)_14px_15px)]" />
      <div className="relative flex h-full w-full items-center justify-center">
        <img
          src={ETS_LOGO_URL}
          alt="End Time Soldiers — Raising a Kingdom Army for Such a Time as This"
          className="w-[min(52%,220px)] max-h-[76%] rounded-xl object-contain ring-1 ring-primary/30 shadow-[0_0_70px_-8px_var(--primary)]"
        />
      </div>
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />}
    </div>
  );
}
