// ============================================================
// Brand Component
// ============================================================

import Image from 'next/legacy/image'
import React from 'react'

export const ETS_COVER_URL = '/assets/ets-cover.jpeg'

export function EtsWordmark({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-xl font-bold text-gold-gradient">
        {compact ? 'ETS' : 'End Time Soldiers'}
      </span>
    </div>
  )
}

export function EtsCover({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 bg-[url('/assets/ets-cover.jpeg')] bg-cover bg-center bg-opacity-30 ${className || ''}`} />
  )
}

export function BrandLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-20 w-20 rounded-full bg-gold-gradient flex items-center justify-center">
        <span className="text-3xl font-black text-background">⚔️</span>
      </div>
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-gold-gradient">End Time Soldiers</h1>
        <p className="text-xs text-muted-foreground tracking-[0.3em]">RAISING BOLD BELIEVERS ⚔️</p>
      </div>
    </div>
  )
}
