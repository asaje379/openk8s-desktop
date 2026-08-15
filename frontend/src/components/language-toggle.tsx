import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'

export function LanguageToggle() {
    const {i18n, t} = useTranslation()
    const isFr = i18n.language.startsWith('fr')
    const target = isFr ? 'en' : 'fr'

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void i18n.changeLanguage(target)}
                    aria-label={t('common.language')}
                >
                    <span className="text-xs font-semibold uppercase">{target}</span>
                    <span className="sr-only">{t('common.language')}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.language')}</TooltipContent>
        </Tooltip>
    )
}
