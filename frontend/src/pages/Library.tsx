import { useState } from 'react'
import { apiRequest, uploadFile } from '@/utils/api'
import brand from '@/utils/brand'

export default function Library() {
  const [videos, setVideos] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleUpload = async () => {
    setUploading(true)
    for (const file of selectedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name.replace(/\.[^.]+$/, ''))
        await uploadFile('/api/videos/upload', file)
      } catch (e) {
        console.error(e)
      }
    }
    setUploading(false)
    setSelectedFiles([])
    fetchVideos()
  }

  const fetchVideos = async () => {
    try {
      const data = await apiRequest('/api/videos/')
      setVideos(data)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredVideos = videos.filter((v) =>
    v.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Media Library</h1>
        <button className="btn-primary" onClick={handleUpload} disabled={uploading || !selectedFiles.length}>
          {uploading ? 'Uploading...' : `📤 Upload (${selectedFiles.length})`}
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          style={{ display: 'none' }}
          id="fileInput"
        />
        <label htmlFor="fileInput" className="btn-secondary" style={{ cursor: 'pointer' }}>
          📁 Choose Files ({selectedFiles.length} selected)
        </label>
      </div>

      <input
        type="text"
        placeholder="Search videos, clips, assets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 24 }}
      />

      <div className="grid-layout">
        {filteredVideos.map((video) => (
          <div key={video.id} className="card">
            <div style={{ background: '#1a1a1a', borderRadius: 8, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 48 }}>🎬</span>
            </div>
            <h3 style={{ marginBottom: 4 }}>{video.title}</h3>
            <p style={{ fontSize: 13, color: '#888' }}>{video.duration_formatted} | {video.category}</p>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <span className="status-badge" style={{ background: '#333', color: '#ccc' }}>
                {video.status}
              </span>
              <span style={{ fontSize: 12, color: brand.colors.gold }}>
                {video.clips?.length || 0} clips
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>📋 Content Pipeline Status</h3>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#888' }}>Uploaded:</span>{' '}
            <span style={{ color: brand.colors.gold }}>{videos.filter((v) => v.status === 'uploaded').length}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>Processing:</span>{' '}
            <span style={{ color: brand.colors.gold }}>{videos.filter((v) => v.status === 'processing').length}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>Processed:</span>{' '}
            <span style={{ color: brand.colors.gold }}>{videos.filter((v) => v.status === 'processed').length}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>Failed:</span>{' '}
            <span style={{ color: '#ff4444' }}>{videos.filter((v) => v.status === 'failed').length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
