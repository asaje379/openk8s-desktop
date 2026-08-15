import {useTranslation} from 'react-i18next'
import {NativeSelect} from '@/components/ui/native-select'
import {useAppStore} from '@/stores/app-store'
import {useNamespaces} from '@/hooks/use-k8s'

interface NamespaceSelectProps {
    value: string
    onChange: (namespace: string) => void
}

export function NamespaceSelect({value, onChange}: NamespaceSelectProps) {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data: namespaces = []} = useNamespaces(activeCluster?.id ?? null)

    return (
        <NativeSelect
            className="w-56"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={t('resources.namespace')}
        >
            <option value="">{t('resources.allNamespaces')}</option>
            {(namespaces ?? []).map((ns) => (
                <option key={ns.name} value={ns.name}>
                    {ns.name}
                </option>
            ))}
        </NativeSelect>
    )
}
