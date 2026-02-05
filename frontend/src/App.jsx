import { useState } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import { authAPI } from './api/auth'
import './index.css'

export default function App() {
  const [page, setPage] = useState('login')
  const [successMessage, setSuccessMessage] = useState('')
  const isAuthenticated = authAPI.isAuthenticated()

  if (isAuthenticated) {
    return <Dashboard />
  }

  return (
    <div>
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
          <button
            onClick={() => setSuccessMessage('')}
            className="ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {page === 'login' ? (
        <Login
          onSuccess={(msg) => {
            setSuccessMessage(msg)
            setTimeout(() => window.location.reload(), 1500)
          }}
          onSwitchToRegister={() => setPage('register')}
          onSwitchToForgotPassword={() => setPage('forgot-password')}
        />
      ) : page === 'register' ? (
        <Register
          onSuccess={(msg) => {
            setSuccessMessage(msg)
            setTimeout(() => setPage('login'), 2000)
          }}
          onSwitchToLogin={() => setPage('login')}
        />
      ) : page === 'forgot-password' ? (
        <ForgotPassword
          onBackToLogin={() => setPage('login')}
          onSwitchToResetPassword={() => setPage('reset-password')}
        />
      ) : page === 'reset-password' ? (
        <ResetPassword
          onBackToLogin={() => setPage('login')}
        />
      ) : null}
    </div>
  )
}
