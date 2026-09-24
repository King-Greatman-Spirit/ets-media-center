import { useState, useEffect } from 'react'
import { apiRequest } from '@/utils/api'
import brand from '@/utils/brand'
import Link from 'next/link'

export default function Studio() {
  const [clips, setClips] = useState<any[]>([])
  const [selectedClip, setSelectedClip] = useState<any>(null)
  const [platforms, setPlatforms] = useState<any[]>([])
  const [generatedContent, setGeneratedContent] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchClips()
    fetchPlatforms()
  }, [])

  const fetchClips = async () => {
    try {
      const data = await apiRequest('/api/clips/')
      setClips(data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchPlatforms = async () => {
    try {
      const data = await apiRequest('/api/platforms/')
      setPlatforms(data)
    } catch (e) {
      console.error(e)
    }
  }

  const repurposeClip = async (clipId: string) => {
    setIsProcessing(true)
    try {
      const connectedPlatforms = platforms.filter((p) => p.connection_status === 'connected').map((p) => p.name)
      const result = await apiRequest(`/api/clips/${clipId}/repurpose?platforms=${connectedPlatforms.join(',')}`, {
        method: 'POST',
      })
      setGeneratedContent(result)
      fetchClips()
    } catch (e) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  const approveContent = async (contentId: string) => {
    try {
      await apiRequest(`/api/content/${contentId}/approve`, { method: 'PUT' })
      fetchClips()
    } catch (e) {
      console.error(e)
    }
  }

  const runEngine = async () => {
    setIsProcessing(true)
    try {
      const result = await apiRequest('/api/engine/run', { method: 'POST' })
      alert(`Media Engine: ${result.summary}`)
      fetchClips()
    } catch (e) {
      console.error(e)
    }
    setIsProcessing(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Repurposing Studio</h1>
        <button className="btn-primary" onClick={runEngine} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : '⚡ Run Media Engine'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 16 }}>Identified Clips ({clips.length})</h2>
          <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="card"
                style={{ cursor: 'pointer', border: selectedClip?.id === clip.id ? '2px solid #D4AF37' : '1px solid #2a2a2a' }}
                onClick={() => setSelectedClip(clip)}
              >
                <div style={{ background: '#1a1a1a', borderRadius: 8, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 36 }}>🎯</span>
                </div>
                <h3 style={{ fontSize: 15, marginBottom: 4 }}>{clip.title}</h3>
                <p style={{ fontSize: 12, color: brand.colors.gold }}>{clip.topic}</p>
                <p style={{ fontSize: 11, color: '#888' }}>
                  {clip.start_time}s - {clip.end_time}s ({Math.round(clip.duration_sec || 0)}s)
                </p>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <span className="status-badge" style={{ background: '#333', color: '#ccc', fontSize: 10 }}>
                    {clip.status}
                  </span>
                  {clip.confidence_score && (
                    <span style={{ fontSize: 11, color: '#888' }}>
                      Confidence: {Math.round(clip.confidence_score * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedClip && (
          <div style={{ width: 400 }}>
            <h2 style={{ marginBottom: 16 }}>Preview & Actions</h2>
            <div className="card">
              <h3>{selectedClip.title}</h3>
              <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>{selectedClip.description}</p>
              <p style={{ fontSize: 12, color: brand.colors.gold }}>Hook: {selectedClip.hook}</p>
              <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Topic: {selectedClip.topic}</p>

              <div style={{ marginTop: 20 }}>
                <h4>Generate Content</h4>
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => repurposeClip(selectedClip.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Generating...' : '✨ Generate for All Platforms'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {generatedContent.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2>Generated Content</h2>
          <div className="grid-layout">
            {generatedContent.map((item: any, i: number) => (
              <div key={i} className="card">
                <h3>{item.title}</h3>
                <p style={{ fontSize: 13 }}><strong>Hook:</strong> {item.hook}</p>
                <p style={{ fontSize: 13 }}><strong>CTA:</strong> {item.cta}</p>
                <div style={{ marginTop: 8 }}>
                  {item.hashtags?.map((tag: string, j: number) => (
                    <span key={j} style={{ background: '#222', padding: '2px 8px', borderRadius: 12, fontSize: 11, marginRight: 4 }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => approveContent(item.id)}>
                  ✅ Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
