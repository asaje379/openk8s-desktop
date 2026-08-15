import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'

export function LanguageToggle() {
    const {i18n, t} = useTranslation()
    const isFr = i18n.language.startsWith('fr')
    const target = isFr ? 'en' : 'fr'

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => void i18n.changeLanguage(target)}
            title={t('common.language')}
            aria-label={t('common.language')}
        >
            <span className="text-xs font-semibold uppercase">{target}</span>
            <span className="sr-only">{t('common.language')}</span>
        </Button>
    )
}
