import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#313338',
            color: '#dbdee1',
            border: '1px solid rgba(255,255,255,0.05)',
          },
          success: {
            iconTheme: { primary: '#23a55a', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#f23f43', secondary: '#fff' },
          },
          duration: 3000,
        }}
      />
    </AuthProvider>
  </StrictMode>
)
