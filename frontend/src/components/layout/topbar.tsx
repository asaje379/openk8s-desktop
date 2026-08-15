import {useTranslation} from 'react-i18next'
import {LanguageToggle} from '@/components/language-toggle'
import {ThemeToggle} from '@/components/theme-toggle'
import {NamespaceSwitcher} from '@/components/namespace-switcher'
import {useAppStore} from '@/stores/app-store'

export function Topbar() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)

    return (
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4">
            <div className="flex min-w-0 items-center gap-3">
                {activeCluster ? (
                    <>
                        <span className="font-medium text-foreground">{activeCluster.name}</span>
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                            {activeCluster.context}
                        </span>
                    </>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        {t('topbar.noActiveContext')}
                    </span>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <NamespaceSwitcher/>
                <LanguageToggle/>
                <ThemeToggle/>
            </div>
        </header>
    )
}
