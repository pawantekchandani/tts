import { useState } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './components/AdminDashboard'
import PlanSettings from './components/PlanSettings'
import UserManagement from './components/UserManagement'
import { authAPI } from './api/auth'
import './index.css'

function AdminView() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'settings' && <PlanSettings />}
    </AdminLayout>
  )
}

export default function App() {
  const [page, setPage] = useState('login')
  const [successMessage, setSuccessMessage] = useState('')
  const isAuthenticated = authAPI.isAuthenticated()
  const userEmail = authAPI.getUserEmail()

  if (isAuthenticated) {
    // Simple check for admin routing. 
    // Real security is handled by the backend rejecting non-admin requests.
    if (userEmail && userEmail.toLowerCase() === 'admin@gmail.com') {
      return <AdminView />
    }
    return <Dashboard userPlan={authAPI.getUserPlan()} />
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
            // Reload to update authentication state
            setTimeout(() => window.location.reload(), 1000)
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
