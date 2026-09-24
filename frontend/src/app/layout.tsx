import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'End Time Soldiers Media Command Center',
  description: 'AI-powered content engine for End Time Soldiers ministry',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, marginLeft: 260 }}>
            <Header />
            <main style={{ padding: '24px', paddingLeft: '20px' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
