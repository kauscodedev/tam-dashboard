import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TAM Distribution Dashboard',
  description: 'Total Addressable Market tracking for US automotive dealerships',
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
