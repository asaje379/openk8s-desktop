import {Monitor, Moon, Sun, type LucideIcon} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'
import {useTheme, type Theme} from '@/components/providers/theme-provider'

const icons: Record<Theme, LucideIcon> = {
    light: Sun,
    dark: Moon,
    system: Monitor,
}

const nextTheme: Record<Theme, Theme> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
}

export function ThemeToggle() {
    const {theme, setTheme} = useTheme()
    const {t} = useTranslation()
    const Icon = icons[theme]

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(nextTheme[theme])}
            title={t(`common.${theme}`)}
            aria-label={t('common.theme')}
        >
            <Icon className="size-4"/>
            <span className="sr-only">{t('common.theme')}</span>
        </Button>
    )
}
