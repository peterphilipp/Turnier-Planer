import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

import './styles/design-tokens.css'
import './styles/base.css'
import './styles/components/auth.css'
import './styles/components/dashboard.css'
import './styles/components/admin.css'
import './styles/components/shared.css'
import './styles/components/admin-core.css'
import './styles/components/admin-data.css'

import App from './App'

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Die App bleibt am Turniertag oft stundenlang in einem Tab offen
      // (Tablet als Hallen-Zentrale) und wird nie manuell neu geladen - ohne
      // periodischen Check würde ein neues Deployment erst sichtbar, wenn der
      // Browser zufällig sein eigenes ~24h-Intervall erreicht.
      setInterval(() => { registration.update() }, 30 * 60 * 1000)
    }
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
