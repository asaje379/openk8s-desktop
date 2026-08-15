import {useTranslation} from 'react-i18next'
import {useAppStore} from '@/stores/app-store'
import {LanguageToggle} from '@/components/language-toggle'
import {ThemeToggle} from '@/components/theme-toggle'

export function Topbar() {
    const {t} = useTranslation()
    const activeClusterId = useAppStore((s) => s.activeClusterId)
    const currentContext = useAppStore((s) => s.currentContext)
    const activeNamespace = useAppStore((s) => s.activeNamespace)

    return (
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="text-sm text-muted-foreground">
                {currentContext ? (
                    <span>
                        {t('topbar.context')}:{' '}
                        <span className="font-medium text-foreground">{currentContext}</span>
                    </span>
                ) : (
                    <span>{t('topbar.noActiveContext')}</span>
                )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {activeClusterId && (
                    <span>
                        {t('topbar.cluster')}: {activeClusterId}
                    </span>
                )}
                {activeNamespace && (
                    <span>
                        {t('topbar.namespace')}: {activeNamespace}
                    </span>
                )}
                <LanguageToggle/>
                <ThemeToggle/>
            </div>
        </header>
    )
}
