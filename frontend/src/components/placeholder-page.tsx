import {useTranslation} from 'react-i18next'

interface PlaceholderPageProps {
    titleKey: string
}

export function PlaceholderPage({titleKey}: PlaceholderPageProps) {
    const {t} = useTranslation()

    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h1>
            <p className="max-w-md text-sm text-muted-foreground">{t('placeholder.description')}</p>
        </div>
    )
}
