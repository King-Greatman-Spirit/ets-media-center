import logoAsset from "@/assets/ets-logo.jpg.asset.json";
import coverAsset from "@/assets/ets-cover.jpeg.asset.json";
import { cn } from "@/lib/utils";

export const ETS_LOGO_URL = logoAsset.url;
export const ETS_COVER_URL = coverAsset.url;

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
    <div className={cn("relative overflow-hidden", className)}>
      <img
        src={ETS_COVER_URL}
        alt="End Time Soldiers — Raising a Kingdom Army for Such a Time as This"
        className="h-full w-full object-cover"
      />
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />}
    </div>
  );
}
