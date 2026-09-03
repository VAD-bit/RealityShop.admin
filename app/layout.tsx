import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Reality Shop Admin',
  description: 'Panel de administración',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-[#060608] text-white antialiased">
        {children}
      </body>
    </html>
  )
}