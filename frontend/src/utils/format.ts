export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#555',
    needs_review: '#8B0000',
    approved: '#1a5c1a',
    scheduled: '#2a4a8a',
    published: '#D4AF37',
    failed: '#660000',
    uploaded: '#666',
    processing: '#2a4a8a',
    processed: '#1a5c1a',
  }
  return colors[status] || '#555'
}

export function generateHashtags(topic: string): string[] {
  return [
    '#EndTimeSoldiers',
    '#KingdomArmyTV',
    '#RaisingBoldBelievers',
    '#Scripture',
    '#Faith',
    '#Gospel',
    '#Prayer',
    `#${topic}`
  ]
}
