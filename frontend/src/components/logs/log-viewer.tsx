import {useEffect, useMemo, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {Clipboard, Download, Eraser, Search} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Checkbox} from '@/components/ui/checkbox'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import {EventsOn, StartDeploymentLogStream, StartLogStream, StopLogStream} from '@/lib/wails'

interface LogViewerProps {
    clusterId: string
    namespace: string
    pod?: string
    deployment?: string
    containers: string[]
}

export function LogViewer({clusterId, namespace, pod, deployment, containers}: LogViewerProps) {
    const {t} = useTranslation()
    const [container, setContainer] = useState(containers[0] ?? '')
    const [follow, setFollow] = useState(true)
    const [tailLines, setTailLines] = useState(200)
    const [search, setSearch] = useState('')
    const [logs, setLogs] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [streaming, setStreaming] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let streamId: string | null = null
        let cancelled = false

        const onData = (d: {streamId: string; data: string}) => {
            if (d.streamId === streamId) setLogs((prev) => prev + d.data)
        }
        const onError = (d: {streamId: string; message: string}) => {
            if (d.streamId === streamId) setError(d.message)
        }
        const onEnd = (d: {streamId: string}) => {
            if (d.streamId === streamId) setStreaming(false)
        }

        const offData = EventsOn('logs:data', onData)
        const offError = EventsOn('logs:error', onError)
        const offEnd = EventsOn('logs:end', onEnd)

        setLogs('')
        setError(null)
        setStreaming(true)

        const start = () => {
            if (pod) return StartLogStream(clusterId, namespace, pod, container, tailLines, follow)
            if (deployment)
                return StartDeploymentLogStream(clusterId, namespace, deployment, container, tailLines, follow)
            return Promise.reject(new Error('no log source'))
        }

        start().then((sid) => {
            if (cancelled) {
                StopLogStream(sid)
                return
            }
            streamId = sid
        })

        return () => {
            cancelled = true
            offData()
            offError()
            offEnd()
            if (streamId) StopLogStream(streamId)
        }
    }, [clusterId, namespace, pod, deployment, container, follow, tailLines])

    useEffect(() => {
        if (follow && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs, follow])

    const displayed = useMemo(() => {
        if (!search) return logs
        return logs
            .split('\n')
            .filter((line) => line.toLowerCase().includes(search.toLowerCase()))
            .join('\n')
    }, [logs, search])

    const handleCopy = async () => {
        const fallback = () => {
            const ta = document.createElement('textarea')
            ta.value = logs
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
        }
        try {
            await navigator.clipboard.writeText(logs)
        } catch {
            fallback()
        }
        toast.success(t('pod.copySuccess'))
    }

    const handleDownload = (text: string) => {
        const blob = new Blob([text], {type: 'text/plain'})
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${pod || deployment || 'logs'}-${container || 'logs'}.log`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    return (
        <div className="flex h-[62vh] flex-col gap-3">
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
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={follow} onCheckedChange={(c) => setFollow(!!c)}/>
                    {t('pod.follow')}
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                    {t('pod.tailLines')}
                    <Input
                        type="number"
                        className="h-8 w-20"
                        value={tailLines}
                        onChange={(e) => setTailLines(Math.max(1, Number(e.target.value)))}
                        min={1}
                    />
                </label>
                <div className="relative ml-auto w-56">
                    <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground"/>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('resources.search')}
                        className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm"
                    />
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={() => setLogs('')}>
                            <Eraser className="size-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('pod.clear')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={handleCopy}>
                            <Clipboard className="size-4"/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('pod.copy')}</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                            <Download className="size-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDownload(displayed)}>
                            {t('pod.downloadVisible')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(logs)}>
                            {t('pod.downloadAll')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {error && <p className="break-words text-sm text-destructive">{error}</p>}

            <div
                ref={scrollRef}
                className="flex-1 overflow-auto rounded-md border border-border bg-black p-3 font-mono text-xs text-gray-200"
            >
                {displayed ? (
                    <pre className="whitespace-pre-wrap break-all">{displayed}</pre>
                ) : streaming ? (
                    <span className="text-gray-500">{t('pod.loadingLogs')}</span>
                ) : (
                    <span className="text-gray-500">{t('pod.noLogs')}</span>
                )}
            </div>
        </div>
    )
}
