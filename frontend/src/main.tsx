import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { DiscountProvider } from './context/DiscountContext'

import store from './store/store.ts'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <CurrencyProvider>
              <DiscountProvider>
                <App />
              </DiscountProvider>
            </CurrencyProvider>
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
      </QueryClientProvider>
    </Provider>
    </ErrorBoundary>
  </StrictMode>,
)
