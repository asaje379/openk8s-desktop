import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Plus} from 'lucide-react'
import {NativeSelect} from '@/components/ui/native-select'
import {Button} from '@/components/ui/button'
import {useAppStore} from '@/stores/app-store'
import {useNamespaces, useSavedNamespaces} from '@/hooks/use-k8s'
import {AddNamespaceDialog} from '@/components/add-namespace-dialog'

interface NamespaceSelectProps {
    value: string
    onChange: (namespace: string) => void
}

export function NamespaceSelect({value, onChange}: NamespaceSelectProps) {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const {data: saved = []} = useSavedNamespaces(activeCluster?.id ?? null)
    const {data: discovered = []} = useNamespaces(activeCluster?.id ?? null)
    const [addOpen, setAddOpen] = useState(false)

    const options = useMemo(() => {
        const set = new Set<string>()
        for (const ns of saved ?? []) set.add(ns)
        for (const ns of discovered ?? []) set.add(ns.name)
        return Array.from(set).sort()
    }, [saved, discovered])

    return (
        <div className="flex items-center gap-2">
            <NativeSelect
                className="w-56"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={t('resources.namespace')}
            >
                <option value="">{t('resources.allNamespaces')}</option>
                {options.map((ns) => (
                    <option key={ns} value={ns}>
                        {ns}
                    </option>
                ))}
            </NativeSelect>
            <Button
                size="icon"
                variant="outline"
                onClick={() => setAddOpen(true)}
                title={t('resources.addNamespace')}
            >
                <Plus className="size-4"/>
                <span className="sr-only">{t('resources.addNamespace')}</span>
            </Button>
            <AddNamespaceDialog open={addOpen} onOpenChange={setAddOpen} onAdded={onChange}/>
        </div>
    )
}
