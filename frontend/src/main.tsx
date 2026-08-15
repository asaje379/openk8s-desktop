import React from 'react'
import {createRoot} from 'react-dom/client'
import {RouterProvider} from 'react-router'
import {QueryClientProvider} from '@tanstack/react-query'
import {Toaster} from 'sonner'
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import {queryClient} from './lib/query-client'
import {router} from './routes'
import {ThemeProvider} from './components/providers/theme-provider'
import {TooltipProvider} from './components/ui/tooltip'
import './lib/i18n'
import './style.css'

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <TooltipProvider delayDuration={150}>
                <QueryClientProvider client={queryClient}>
                    <RouterProvider router={router}/>
                    <Toaster position="bottom-right" richColors/>
                </QueryClientProvider>
            </TooltipProvider>
        </ThemeProvider>
    </React.StrictMode>
)
