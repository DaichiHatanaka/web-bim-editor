import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kühl HVAC Editor',
  description: 'HVAC equipment design editor',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
