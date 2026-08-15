import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Terminal as XTerm} from '@xterm/xterm'
import {FitAddon} from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {CloseExec, EventsOn, ResizeExec, StartExec, WriteExec} from '@/lib/wails'

const SHELLS = ['/bin/sh', '/bin/bash', '/bin/ash']

interface TerminalViewProps {
    clusterId: string
    namespace: string
    pod: string
    containers: string[]
}

export function TerminalView({clusterId, namespace, pod, containers}: TerminalViewProps) {
    const {t} = useTranslation()
    const [container, setContainer] = useState(containers[0] ?? '')
    const [shell, setShell] = useState('/bin/sh')
    const [error, setError] = useState<string | null>(null)
    const termElRef = useRef<HTMLDivElement>(null)
    const termRef = useRef<XTerm | null>(null)
    const sessionIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (!termElRef.current) return

        const xterm = new XTerm({
            cursorBlink: true,
            fontSize: 13,
            theme: {background: '#0b1326', foreground: '#dae2fd'},
        })
        const fit = new FitAddon()
        xterm.loadAddon(fit)
        xterm.open(termElRef.current)
        fit.fit()
        termRef.current = xterm

        const onOutput = (d: {sessionId: string; data: string}) => {
            if (d.sessionId === sessionIdRef.current) xterm.write(d.data)
        }
        const onError = (d: {sessionId: string; message: string}) => {
            if (d.sessionId === sessionIdRef.current) setError(d.message)
        }
        const onEnd = (d: {sessionId: string}) => {
            if (d.sessionId === sessionIdRef.current) {
                sessionIdRef.current = null
                xterm.write('\r\n\x1b[33m[session closed]\x1b[0m\r\n')
            }
        }

        const offOutput = EventsOn('exec:output', onOutput)
        const offError = EventsOn('exec:error', onError)
        const offEnd = EventsOn('exec:end', onEnd)

        xterm.onData((data) => {
            if (sessionIdRef.current) WriteExec(sessionIdRef.current, data)
        })
        xterm.onResize(({cols, rows}) => {
            if (sessionIdRef.current) ResizeExec(sessionIdRef.current, cols, rows)
        })

        return () => {
            offOutput()
            offError()
            offEnd()
            if (sessionIdRef.current) CloseExec(sessionIdRef.current)
            xterm.dispose()
            termRef.current = null
        }
    }, [])

    useEffect(() => {
        setError(null)
        let cancelled = false

        StartExec(clusterId, namespace, pod, container, shell)
            .then((sid) => {
                if (cancelled) {
                    CloseExec(sid)
                    return
                }
                sessionIdRef.current = sid
                if (termRef.current) {
                    ResizeExec(sid, termRef.current.cols, termRef.current.rows)
                }
            })
            .catch((e) => setError(String(e)))

        return () => {
            cancelled = true
            if (sessionIdRef.current) {
                CloseExec(sessionIdRef.current)
                sessionIdRef.current = null
            }
        }
    }, [clusterId, namespace, pod, container, shell])

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Select value={container} onValueChange={setContainer}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('pod.container')}/>
                    </SelectTrigger>
                    <SelectContent>
                        {containers.map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={shell} onValueChange={setShell}>
                    <SelectTrigger className="w-40">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        {SHELLS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {error && <p className="break-words text-sm text-destructive">{error}</p>}
            </div>
            <div ref={termElRef} className="h-[62vh] overflow-hidden rounded-md border border-border"/>
        </div>
    )
}
