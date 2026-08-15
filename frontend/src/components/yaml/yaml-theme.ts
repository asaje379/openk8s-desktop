import {EditorView} from 'codemirror'

export const yamlTheme = EditorView.theme(
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
