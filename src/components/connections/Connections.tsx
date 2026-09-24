// ============================================================
// Connections Component - Upgraded
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { connectionsQuery } from '@/lib/data'
import { PLATFORMS } from '@/lib/platforms'
import { PageHeader } from '@/components/app/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useContentStore } from '@/store'
import { Platform } from '@/lib/platforms'

export function Connections() {
  const connections = useQuery(connectionsQuery)
  const { setPlatforms } = useContentStore()

  return (
    <div>
      <PageHeader eyebrow="Connections" title="Platform Connections" description="Connect all social media platforms to enable automatic publishing and AI-driven content dispatch." />

      <p className="text-sm text-muted-foreground mb-6">All credentials are stored securely with encryption. Never share your credentials.</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connected = connections.data?.find((c: any) => c.platform === platform.id)
          const isConnected = connected?.status === 'connected'

          return (
            <Card key={platform.id} className="card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: platform.color, opacity: isConnected ? 1 : 0.3 }}>
                    {platform.short}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{platform.name}</h3>
                    <p className="text-xs text-muted-foreground">{platform.format}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" style={{ background: isConnected ? '#1a5c1a' : '#333', color: isConnected ? '#fff' : '#888' }}>
                    {isConnected ? '✅ Connected' : '❌ Disconnected'}
                  </Badge>
                  <Button size="sm" variant={isConnected ? 'outline' : 'default'}>{isConnected ? 'Reconnect' : 'Connect'}</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="card mt-8">
        <CardContent className="pt-6">
          <h3 className="font-display text-lg font-semibold mb-2">🔒 Security</h3>
          <p className="text-sm text-muted-foreground">All API credentials are encrypted and stored securely. The system never requests or stores passwords in plain text. OAuth tokens are used for secure authentication. Credentials are only accessible to authenticated users with the required permissions.</p>
        </CardContent>
      </Card>
    </div>
  )
}
