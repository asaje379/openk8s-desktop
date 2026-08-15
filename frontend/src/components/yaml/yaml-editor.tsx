import {useEffect, useRef, useState} from 'react'
import {EditorView, basicSetup} from 'codemirror'
import {yaml} from '@codemirror/lang-yaml'
import {useTranslation} from 'react-i18next'
import {Button} from '@/components/ui/button'
import {yamlTheme} from './yaml-theme'

interface YamlEditorProps {
    initialValue: string
    onApply: (value: string) => void
    isApplying: boolean
}

export function YamlEditor({initialValue, onApply, isApplying}: YamlEditorProps) {
    const {t} = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const initialRef = useRef(initialValue)
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        if (!containerRef.current) return
        const view = new EditorView({
            parent: containerRef.current,
            doc: initialRef.current,
            extensions: [
                basicSetup,
                yaml(),
                EditorView.lineWrapping,
                EditorView.updateListener.of((u) => {
                    if (u.docChanged) setDirty(true)
                }),
                yamlTheme,
            ],
        })
        viewRef.current = view
        return () => {
            view.destroy()
            viewRef.current = null
        }
    }, [])

    const handleApply = () => {
        if (viewRef.current) onApply(viewRef.current.state.doc.toString())
    }

    const handleReset = () => {
        const view = viewRef.current
        if (!view) return
        view.dispatch({
            changes: {from: 0, to: view.state.doc.length, insert: initialRef.current},
        })
        setDirty(false)
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{t('yaml.applyWarning')}</p>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleReset} disabled={!dirty || isApplying}>
                        {t('yaml.reset')}
                    </Button>
                    <Button size="sm" onClick={handleApply} disabled={!dirty || isApplying}>
                        {isApplying ? t('yaml.applying') : t('yaml.apply')}
                    </Button>
                </div>
            </div>
            <div ref={containerRef} className="overflow-auto rounded-md border border-border"/>
        </div>
    )
}
