import {Component, type ErrorInfo, type ReactNode} from 'react'
import {useNavigate} from 'react-router'
import {useTranslation} from 'react-i18next'
import {AlertTriangle} from 'lucide-react'
import {Button} from '@/components/ui/button'

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {error: null}

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {error}
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Uncaught render error:', error, info)
    }

    render() {
        if (this.state.error) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    onReset={() => this.setState({error: null})}
                />
            )
        }
        return this.props.children
    }
}

function ErrorFallback({error, onReset}: {error: Error; onReset: () => void}) {
    const navigate = useNavigate()
    const {t} = useTranslation()

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertTriangle className="size-10 text-destructive"/>
            <h1 className="text-2xl font-semibold tracking-tight">{t('error.title')}</h1>
            <p className="max-w-md text-sm text-muted-foreground">{t('error.description')}</p>
            <details className="max-w-lg text-left text-xs text-muted-foreground">
                <summary className="cursor-pointer">{t('error.details')}</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3">
                    {error.message}
                </pre>
            </details>
            <Button
                onClick={() => {
                    navigate('/', {replace: true})
                    onReset()
                }}
            >
                {t('error.returnHome')}
            </Button>
        </div>
    )
}

export {ErrorBoundary}
