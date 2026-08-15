import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {TestKubeconfig, ValidateKubeconfig} from '@/lib/wails'
import type {ConnectionStatus, KubeconfigInfo} from '@/lib/wails'
import {useAddCluster} from './use-clusters'

interface AddClusterDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AddClusterDialog({open, onOpenChange}: AddClusterDialogProps) {
    const {t} = useTranslation()
    const addCluster = useAddCluster()

    const [name, setName] = useState('')
    const [kubeconfig, setKubeconfig] = useState('')
    const [info, setInfo] = useState<KubeconfigInfo | null>(null)
    const [context, setContext] = useState('')
    const [validating, setValidating] = useState(false)
    const [validateError, setValidateError] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<ConnectionStatus | null>(null)
    const [testing, setTesting] = useState(false)

    const reset = () => {
        setName('')
        setKubeconfig('')
        setInfo(null)
        setContext('')
        setValidateError(null)
        setTestResult(null)
    }

    const handleValidate = async () => {
        setValidating(true)
        setValidateError(null)
        setInfo(null)
        setTestResult(null)
        try {
            const res = await ValidateKubeconfig(kubeconfig)
            setInfo(res)
            setContext(res.currentContext || res.contexts[0]?.name || '')
        } catch (err) {
            setValidateError(String(err))
        } finally {
            setValidating(false)
        }
    }

    const handleTest = async () => {
        setTesting(true)
        setTestResult(null)
        try {
            setTestResult(await TestKubeconfig(kubeconfig, context))
        } catch (err) {
            setTestResult({connected: false, server: '', version: '', message: String(err)})
        } finally {
            setTesting(false)
        }
    }

    const handleSave = () => {
        addCluster.mutate(
            {name: name.trim(), kubeconfig, context},
            {
                onSuccess: () => {
                    reset()
                    onOpenChange(false)
                },
            }
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) reset()
                onOpenChange(next)
            }}
        >
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('clusters.addCluster')}</DialogTitle>
                    <DialogDescription>{t('clusters.addDescription')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="kubeconfig">{t('clusters.kubeconfig')}</Label>
                        <Textarea
                            id="kubeconfig"
                            value={kubeconfig}
                            onChange={(e) => setKubeconfig(e.target.value)}
                            placeholder={t('clusters.kubeconfigPlaceholder')}
                            rows={10}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">{t('clusters.name')}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('clusters.namePlaceholder')}
                        />
                    </div>

                    {info && (
                        <div className="space-y-2">
                            <Label>{t('clusters.context')}</Label>
                            <Select value={context} onValueChange={setContext}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('clusters.context')}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {info.contexts.map((c) => (
                                        <SelectItem key={c.name} value={c.name}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {t('clusters.contextsFound', {count: info.contexts.length})}
                            </p>
                        </div>
                    )}

                    {validateError && (
                        <p className="text-sm text-destructive">{validateError}</p>
                    )}

                    {testResult &&
                        (testResult.connected ? (
                            <p className="text-sm text-success">
                                {t('clusters.testSuccess', {version: testResult.version})}
                            </p>
                        ) : (
                            <p className="text-sm text-destructive">
                                {t('clusters.testFail')}: {testResult.message}
                            </p>
                        ))}

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={handleValidate}
                            disabled={validating || !kubeconfig}
                        >
                            {validating ? t('clusters.validating') : t('clusters.validate')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleTest}
                            disabled={testing || !info}
                        >
                            {testing ? t('clusters.testing') : t('clusters.testConnection')}
                        </Button>
                        <Button onClick={handleSave} disabled={!info || addCluster.isPending}>
                            {addCluster.isPending ? t('clusters.saving') : t('clusters.save')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
