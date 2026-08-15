import {useEffect, useRef} from 'react'
import {EditorView, basicSetup} from 'codemirror'
import {yaml} from '@codemirror/lang-yaml'
import {yamlTheme} from './yaml-theme'

interface YamlViewerProps {
    value: string
}

export function YamlViewer({value}: YamlViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return
        const view = new EditorView({
            parent: containerRef.current,
            doc: value,
            extensions: [
                basicSetup,
                yaml(),
                EditorView.editable.of(false),
                EditorView.lineWrapping,
                yamlTheme,
            ],
        })
        return () => view.destroy()
    }, [value])

    return <div ref={containerRef} className="overflow-auto rounded-md border border-border"/>
}
