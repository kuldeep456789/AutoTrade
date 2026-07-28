import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'

import store from './store/store.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
            },
            success: {
              iconTheme: { primary: '#000', secondary: '#fff' },
              style: {
                background: '#18181B',
                color: '#fff',
                border: '1px solid #2A2A2A',
              },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              style: {
                background: '#18181B',
                color: '#fff',
                border: '1px solid #2A2A2A',
              },
            },
          }}
        />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
