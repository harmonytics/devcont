import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Django + Next.js Starter',
  description: 'Fullstack starter template',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
