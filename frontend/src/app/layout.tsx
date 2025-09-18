import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import ThemeProvider from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils' // Import cn utility

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Elevator Control System',
  description: 'Advanced elevator simulation system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Use the cn utility to conditionally add overflow-hidden */}
      <body className={cn(inter.className, 'overflow-hidden')} suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}