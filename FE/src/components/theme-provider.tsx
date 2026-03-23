import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  isAuthenticated?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  isAuthenticated: boolean
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  isAuthenticated: false,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  isAuthenticated = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Force Light Mode for guests (not authenticated)
    if (!isAuthenticated) {
      return "light"
    }
    
    // For authenticated users, check for saved preference
    const savedTheme = localStorage.getItem(storageKey) as Theme | null
    return savedTheme || defaultTheme
  })

  // Force Light Mode when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      const root = window.document.documentElement
      root.classList.remove("dark", "system")
      root.classList.add("light")
      setTheme("light")
    }
  }, [isAuthenticated])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    // Only allow theme switching for authenticated users
    if (!isAuthenticated) {
      root.classList.add("light")
      return
    }

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme, isAuthenticated])

  const value = {
    theme: isAuthenticated ? theme : "light",
    setTheme: (theme: Theme) => {
      // Only allow theme changes for authenticated users
      if (!isAuthenticated) {
        console.warn("Theme switching is only available for authenticated users")
        return
      }
      
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    isAuthenticated,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
