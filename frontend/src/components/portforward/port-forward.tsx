import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {EventsOn, StartPortForward, StopPortForward} from '@/lib/wails'

interface PortForwardProps {
    clusterId: string
    namespace: string
    pod: string
}

export function PortForward({clusterId, namespace, pod}: PortForwardProps) {
    const {t} = useTranslation()
    const [localPort, setLocalPort] = useState(8080)
    const [remotePort, setRemotePort] = useState(80)
    const [forwardId, setForwardId] = useState<string | null>(null)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const forwardIdRef = useRef<string | null>(null)

    useEffect(() => {
        const onReady = (d: {forwardId: string; localPort: number}) => {
            if (d.forwardId === forwardIdRef.current) {
                setReady(true)
                setError(null)
            }
        }
        const onError = (d: {forwardId: string; message: string}) => {
            if (d.forwardId === forwardIdRef.current) {
                setError(d.message)
                setReady(false)
            }
        }
        const onEnd = (d: {forwardId: string}) => {
            if (d.forwardId === forwardIdRef.current) {
                setReady(false)
                setForwardId(null)
                forwardIdRef.current = null
            }
        }

        const offReady = EventsOn('portforward:ready', onReady)
        const offError = EventsOn('portforward:error', onError)
        const offEnd = EventsOn('portforward:end', onEnd)
        return () => {
            offReady()
            offError()
            offEnd()
        }
    }, [])

    const handleStart = async () => {
        setError(null)
        try {
            const id = await StartPortForward(clusterId, namespace, pod, localPort, remotePort)
            forwardIdRef.current = id
            setForwardId(id)
        } catch (e) {
            setError(String(e))
        }
    }

    const handleStop = () => {
        if (forwardIdRef.current) {
            StopPortForward(forwardIdRef.current)
            forwardIdRef.current = null
            setForwardId(null)
            setReady(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                    <Label>{t('pod.localPort')}</Label>
                    <Input
                        type="number"
                        className="w-28"
                        value={localPort}
                        onChange={(e) => setLocalPort(Number(e.target.value))}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>{t('pod.remotePort')}</Label>
                    <Input
                        type="number"
                        className="w-28"
                        value={remotePort}
                        onChange={(e) => setRemotePort(Number(e.target.value))}
                    />
                </div>
                {forwardId ? (
                    <Button variant="destructive" onClick={handleStop}>
                        {t('pod.stopForward')}
                    </Button>
                ) : (
                    <Button onClick={handleStart}>{t('pod.startForward')}</Button>
                )}
            </div>
            {ready && (
                <p className="text-sm text-success">
                    http://localhost:{localPort} → {pod}:{remotePort}
                </p>
            )}
            {error && <p className="break-words text-sm text-destructive">{error}</p>}
        </div>
    )
}
