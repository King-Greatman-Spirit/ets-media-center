import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

export function Progress({ value = 0, max = 100, className, ...props }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100)
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/10", className)} {...props}>
      <div className="h-full w-full flex-none bg-gold-gradient transition-all" style={{ width: `${percentage}%` }} />
    </div>
  )
}
