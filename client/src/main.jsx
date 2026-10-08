import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import './index.css'
import AuthGate from './features/auth/AuthGate.jsx'
import ProfileGate from './features/profile/ProfileGate.jsx'
import LoadingSkeleton from './components/LoadingSkeleton.jsx'
import { ThemeProvider } from './components/Theme.jsx'
import { ActionFeedbackProvider } from './components/ActionFeedback.jsx'
import LazyApp from './LazyApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider><ActionFeedbackProvider><BrowserRouter>
      <AuthGate>
        <ProfileGate>
          <Suspense fallback={<LoadingSkeleton type="profile" label="Loading your workspace" />}>
            <LazyApp />
          </Suspense>
        </ProfileGate>
      </AuthGate>
    </BrowserRouter></ActionFeedbackProvider></ThemeProvider>
  </StrictMode>,
)
