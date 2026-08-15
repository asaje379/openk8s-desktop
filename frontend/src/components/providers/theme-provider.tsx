import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
    theme: Theme
    resolvedTheme: 'light' | 'dark'
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'theme'

function getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {
        // ignore storage errors
    }
    return 'system'
}

export function ThemeProvider({children}: {children: ReactNode}) {
    const [theme, setTheme] = useState<Theme>(getStoredTheme)
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)

    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = () => setSystemTheme(mql.matches ? 'dark' : 'light')
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
    }, [])

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    useEffect(() => {
        document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            // ignore storage errors
        }
    }, [theme, resolvedTheme])

    const value = useMemo<ThemeContextValue>(
        () => ({theme, resolvedTheme, setTheme}),
        [theme, resolvedTheme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext)
    if (!context) throw new Error('useTheme must be used within a ThemeProvider')
    return context
}
