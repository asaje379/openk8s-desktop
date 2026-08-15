import React from 'react'
import {createRoot} from 'react-dom/client'
import {RouterProvider} from 'react-router'
import {QueryClientProvider} from '@tanstack/react-query'
import {Toaster} from 'sonner'
import {queryClient} from './lib/query-client'
import {router} from './routes'
import {ThemeProvider} from './components/providers/theme-provider'
import './lib/i18n'
import './style.css'

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router}/>
                <Toaster position="bottom-right" richColors/>
            </QueryClientProvider>
        </ThemeProvider>
    </React.StrictMode>
)
