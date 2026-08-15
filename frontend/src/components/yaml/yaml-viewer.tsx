import {useEffect, useRef} from 'react'
import {EditorView, basicSetup} from 'codemirror'
import {yaml} from '@codemirror/lang-yaml'

const darkTheme = EditorView.theme(
    {
        '&': {backgroundColor: '#0b1326', color: '#dae2fd', height: '100%', fontSize: '12px'},
        '.cm-content': {caretColor: '#b2c5ff'},
        '.cm-gutters': {backgroundColor: '#0b1326', color: '#8d909f', border: 'none'},
        '.cm-activeLine': {backgroundColor: '#131b2e'},
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
            backgroundColor: '#326ce544',
        },
    },
    {dark: true}
)

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
                darkTheme,
            ],
        })
        return () => view.destroy()
    }, [value])

    return <div ref={containerRef} className="overflow-auto rounded-md border border-border"/>
}
