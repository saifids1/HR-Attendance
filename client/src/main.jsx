import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthProvider from './context/AuthContextProvider.jsx'
import EmployProvider, { EmployContext } from './context/EmployContextProvider.jsx'

createRoot(document.getElementById('root')).render(
  <EmployProvider>

  <AuthProvider>


  <StrictMode>
    <App />
  </StrictMode>,
  </AuthProvider>
  </EmployProvider>
)
