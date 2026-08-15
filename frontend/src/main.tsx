import React from 'react'
import {createRoot} from 'react-dom/client'
import {RouterProvider} from 'react-router'
import {QueryClientProvider} from '@tanstack/react-query'
import {queryClient} from './lib/query-client'
import {router} from './routes'
import './style.css'

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router}/>
        </QueryClientProvider>
    </React.StrictMode>
)
