import type { Metadata } from 'next'

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
      <body className="bg-gray-950 text-gray-100 font-mono text-sm">
        {children}
      </body>
    </html>
  )
}
