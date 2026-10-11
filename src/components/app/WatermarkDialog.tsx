import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Type, Image, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type WatermarkSettings = {
  text: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  logoPosition: "left" | "right" | "middle" | "none";
  logoDataUrl: string | null;
  opacity: number;
  size: "small" | "medium" | "large";
};
const DEFAULT_SETTINGS: WatermarkSettings = {
  text: "End Time Soldiers",
  position: "bottom-right",
  logoPosition: "left",
  logoDataUrl: null,
  opacity: 60,
  size: "medium",
};

const STORAGE_KEY = "ets-watermark-v1";

export function loadWatermarkSettings(): WatermarkSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

export function saveWatermarkSettings(s: WatermarkSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/** Build the ffmpeg drawtext filter for the watermark text. */
export function buildTextFilter(s: WatermarkSettings): string | null {
  if (!s.text.trim()) return null;
  const fontSize = s.size === "small" ? 24 : s.size === "large" ? 48 : 32;
  const margin = 24;
  const x = s.position.includes("right") ? `w-text_w-${margin}` : s.position.includes("left") ? `${margin}` : `(w-text_w)/2`;
  const y = s.position.includes("bottom") ? `h-text_h-${margin}` : s.position.includes("top") ? `${margin}` : `(h-text_h)/2`;
  const escaped = s.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
  return `drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=white@${(s.opacity / 100).toFixed(2)}:x=${x}:y=${y}:shadowcolor=black@0.5:shadowx=2:shadowy=2`;
}

/** Build the full filter chain: text + optional logo overlay. */
export function buildWatermarkFilters(
  settings: WatermarkSettings,
  logoPath: string | null,
): string[] {
  const filters: string[] = [];
  const textFilter = buildTextFilter(settings);
  if (textFilter) filters.push(textFilter);
  if (logoPath && settings.logoPosition !== "none") {
    const x = settings.logoPosition === "left" ? "20" : settings.logoPosition === "right" ? "W-w-20" : "(W-w)/2";
    const y = settings.logoPosition === "left" || settings.logoPosition === "right" ? "20" : "H-h-20";
    filters.push(`overlay=${x}:${y}`);
  }
  return filters;
}

export function WatermarkDialog({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: WatermarkSettings;
  onSave: (s: WatermarkSettings) => void;
}) {
  const [local, setLocal] = useState<WatermarkSettings>(settings);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoDataUrl);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG or JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setLocal((s) => ({ ...s, logoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Watermark & Logo</DialogTitle>
          <DialogDescription>Burn your brand onto every clip. Text is required; logo is optional.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Text watermark */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" /> Watermark text
            </Label>
            <Input
              value={local.text}
              onChange={(e) => setLocal((s) => ({ ...s, text: e.target.value }))}
              placeholder="End Time Soldiers"
              maxLength={40}
            />
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Text position</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["top-left", "top-right", "center", "bottom-left", "bottom-right"] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setLocal((s) => ({ ...s, position: pos }))}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs capitalize transition",
                    local.position === pos
                      ? "border-primary bg-accent text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {pos.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Size + opacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select
                value={local.size}
                onValueChange={(v) => setLocal((s) => ({ ...s, size: v as "small" | "medium" | "large" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opacity {local.opacity}%</Label>
              <input
                type="range"
                min={20}
                max={100}
                value={local.opacity}
                onChange={(e) => setLocal((s) => ({ ...s, opacity: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" /> Logo (optional)
            </Label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/50">
                <Upload className="h-4 w-4" />
                {logoPreview ? "Change logo" : "Upload logo"}
                <Input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              {logoPreview && (
                <>
                  <img src={logoPreview} alt="Logo preview" className="h-10 w-10 rounded object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      setLocal((s) => ({ ...s, logoDataUrl: null }));
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove logo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Logo position */}
          {logoPreview && (
            <div className="space-y-2">
              <Label>Logo position</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["left", "middle", "right", "none"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setLocal((s) => ({ ...s, logoPosition: pos }))}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs capitalize transition",
                      local.logoPosition === pos
                        ? "border-primary bg-accent text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {pos === "none" ? "Off" : pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview hint */}
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground/80">Preview:</strong> "{local.text || "…"}" will appear{" "}
            {local.position.replace("-", " ")} of every clip at {local.opacity}% opacity
            {logoPreview && local.logoPosition !== "none" && `, with your logo at ${local.logoPosition}`}.
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-gold-gradient text-primary-foreground hover:opacity-90">
              <Check className="mr-1.5 h-4 w-4" /> Save watermark
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
