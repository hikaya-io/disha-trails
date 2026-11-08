'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/** Follows the system theme until the visitor picks one; the choice is kept in localStorage. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
