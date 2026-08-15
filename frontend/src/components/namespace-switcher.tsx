import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Plus} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {Button} from '@/components/ui/button'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {useAppStore} from '@/stores/app-store'
import {useNamespaces, useSavedNamespaces} from '@/hooks/use-k8s'
import {AddNamespaceDialog} from '@/components/add-namespace-dialog'

export function NamespaceSwitcher() {
    const {t} = useTranslation()
    const activeCluster = useAppStore((s) => s.activeCluster)
    const activeNamespace = useAppStore((s) => s.activeNamespace)
    const setActiveNamespace = useAppStore((s) => s.setActiveNamespace)
    const {data: saved = []} = useSavedNamespaces(activeCluster?.id ?? null)
    const {data: discovered = []} = useNamespaces(activeCluster?.id ?? null)
    const [addOpen, setAddOpen] = useState(false)

    const options = useMemo(() => {
        const set = new Set<string>()
        for (const ns of saved ?? []) set.add(ns)
        for (const ns of discovered ?? []) set.add(ns.name)
        return Array.from(set).sort()
    }, [saved, discovered])

    if (!activeCluster) return null

    return (
        <div className="flex items-center gap-1.5">
            <Select
                value={activeNamespace ?? ''}
                onValueChange={(v) => setActiveNamespace(v === '' ? null : v)}
            >
                <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder={t('resources.allNamespaces')}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">{t('resources.allNamespaces')}</SelectItem>
                    {options.map((ns) => (
                        <SelectItem key={ns} value={ns}>
                            {ns}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setAddOpen(true)}
                    >
                        <Plus className="size-4"/>
                        <span className="sr-only">{t('resources.addNamespace')}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t('resources.addNamespace')}</TooltipContent>
            </Tooltip>
            <AddNamespaceDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                onAdded={setActiveNamespace}
            />
        </div>
    )
}
