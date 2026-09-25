import { platformById } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function PlatformDot({ id, className }: { id: string; className?: string }) {
  const p = platformById(id);
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background", className)}
      style={{ backgroundColor: p?.color ?? "var(--muted-foreground)" }}
      aria-hidden
    />
  );
}

export function PlatformChip({ id, active = true, onClick, className }: { id: string; active?: boolean; onClick?: () => void; className?: string }) {
  const p = platformById(id);
  if (!p) return null;
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
        active ? "border-primary/40 bg-accent/60 text-foreground" : "border-border bg-transparent text-muted-foreground opacity-60 hover:opacity-100",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-background" style={{ backgroundColor: p.color }}>
        {p.short}
      </span>
      {p.name}
    </Comp>
  );
}
