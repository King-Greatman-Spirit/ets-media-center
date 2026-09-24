// ============================================================
// Library Component - Upgraded with DA/BI and AI
// ============================================================

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useContentStore } from '@/store'
import { mediaQuery, videosQuery } from '@/lib/data'
import { PlatformBadge } from '@/components/app/PlatformBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/app/AppShell'
import { getStatusColor, formatBytes } from '@/lib/utils'
import { Upload, Film, ImageIcon, Music, Sparkles, BarChart3 } from 'lucide-react'
import brand from '@/lib/platforms'

export function Library() {
  const media = useQuery(mediaQuery)
  const videos = useQuery(videosQuery)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const allMedia = media.data ?? []
  const filteredMedia = allMedia.filter((m: any) => m.name?.toLowerCase().includes(searchQuery.toLowerCase()))

  const counts = { video: 0, image: 0, audio: 0 }
  for (const m of allMedia) counts[m.kind] = (counts[m.kind] ?? 0) + 1

  async function handleUpload() {
    const formData = new FormData()
    for (const file of selectedFiles) {
      formData.append('file', file)
    }
    try {
      const { supabase } = await import('@/integrations/supabase/client')
      const { data: { user } } = await supabase.auth.getUser()
      for (const file of selectedFiles) {
        const { error } = await supabase.storage.from('media').upload(`${user?.id}/${file.name}`, file)
        if (error) console.error(error)
      }
      setSelectedFiles([])
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Library" title="Media Library" description="Upload and organize all your End Time Soldiers media assets." />

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3 items-center">
          <input type="file" multiple accept="video/*,image/*,audio/*" onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} id="fileInput" className="hidden" />
          <label htmlFor="fileInput" className="btn-primary cursor-pointer">📤 Upload Files ({selectedFiles.length})</label>
          {selectedFiles.length > 0 && <Button variant="outline" onClick={handleUpload}>Upload Now</Button>}
        </div>
        <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-xs" />
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="card text-center"><Film className="h-6 w-6 text-primary mx-auto mb-2" /><div className="font-display text-2xl font-bold text-gold-gradient">{counts.video}</div><p className="text-xs text-muted-foreground">Videos</p></div>
        <div className="card text-center"><ImageIcon className="h-6 w-6 text-primary mx-auto mb-2" /><div className="font-display text-2xl font-bold text-gold-gradient">{counts.image}</div><p className="text-xs text-muted-foreground">Images</p></div>
        <div className="card text-center"><Music className="h-6 w-6 text-primary mx-auto mb-2" /><div className="font-display text-2xl font-bold text-gold-gradient">{counts.audio}</div><p className="text-xs text-muted-foreground">Audio</p></div>
        <div className="card text-center"><BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" /><div className="font-display text-2xl font-bold text-gold-gradient">{allMedia.length}</div><p className="text-xs text-muted-foreground">Total Assets</p></div>
      </div>

      {/* Media Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMedia.map((item: any) => (
          <div key={item.id} className="card">
            <div className="bg-muted rounded-lg h-32 flex items-center justify-center mb-3">
              {item.kind === 'video' ? <Film className="h-8 w-8 text-primary" /> : item.kind === 'image' ? <ImageIcon className="h-8 w-8 text-primary" /> : <Music className="h-8 w-8 text-primary" />}
            </div>
            <h3 className="font-display font-semibold text-sm mb-1">{item.name}</h3>
            <div className="flex items-center justify-between">
              <Badge variant="outline">{item.kind}</Badge>
              <span className="text-xs text-muted-foreground">{formatBytes(item.size_bytes)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" style={{ background: getStatusColor(item.status), color: '#fff', fontSize: '10px' }}>{item.status}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
