import {useTranslation} from 'react-i18next'
import {LanguageToggle} from '@/components/language-toggle'
import {ThemeToggle} from '@/components/theme-toggle'
import {useAppStore} from '@/stores/app-store'

export function Topbar() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)

    return (
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="text-sm text-muted-foreground">
                {activeCluster ? (
                    <span>
                        {t('topbar.context')}:{' '}
                        <span className="font-medium text-foreground">{activeCluster.context}</span>
                    </span>
                ) : (
                    <span>{t('topbar.noActiveContext')}</span>
                )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {activeCluster && (
                    <span>
                        {t('topbar.cluster')}:{' '}
                        <span className="font-medium text-foreground">{activeCluster.name}</span>
                    </span>
                )}
                {activeNamespace && <span>{activeNamespace}</span>}
                <LanguageToggle/>
                <ThemeToggle/>
            </div>
        </header>
    )
}
