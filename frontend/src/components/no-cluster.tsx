import {useTranslation} from 'react-i18next'
import {Boxes} from 'lucide-react'
import {Link} from 'react-router'
import {buttonVariants} from '@/components/ui/button'

export function NoCluster() {
    const {t} = useTranslation()

    return (
        <div className="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <Boxes className="size-10 text-muted-foreground"/>
            <h1 className="text-xl font-semibold tracking-tight">{t('resources.noCluster')}</h1>
            <p className="max-w-md text-sm text-muted-foreground">
                {t('resources.noClusterDescription')}
            </p>
            <Link to="/clusters" className={buttonVariants({variant: 'outline'})}>
                {t('resources.goToClusters')}
            </Link>
        </div>
    )
}
