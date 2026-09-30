import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import './index.css'
import LazyApp from './LazyApp.jsx'
import AuthGate from './features/auth/AuthGate.jsx'
import ProfileGate from './features/profile/ProfileGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
        <ProfileGate>
          <Suspense fallback={<main className="route-loading" aria-label="Loading your workspace" />}>
            <LazyApp />
          </Suspense>
        </ProfileGate>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
)
