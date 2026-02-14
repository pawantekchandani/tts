import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
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
import Home from './components/Home'
import About from './components/About'
import ComingSoon from './components/ComingSoon'
import Plans from './components/Plans'
import Footer from './components/Footer'


// Admin View Component
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

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const isAuthenticated = authAPI.isAuthenticated();
  const userEmail = authAPI.getUserEmail();
  const isAdmin = userEmail && userEmail.toLowerCase() === 'admin@gmail.com';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Routes
function AppContent() {
  const [userPlan, setUserPlan] = useState(authAPI.getUserPlan())
  const isAuthenticated = authAPI.isAuthenticated()
  const userEmail = authAPI.getUserEmail();
  const isAdmin = userEmail && userEmail.toLowerCase() === 'admin@gmail.com';
  const navigate = useNavigate();
  const location = useLocation();

  // Sync plan with backend on mounting
  useEffect(() => {
    if (isAuthenticated) {
      authAPI.getProfile().then(profile => {
        if (profile && profile.plan_type) {
          setUserPlan(profile.plan_type);
        }
      });
    }
  }, [isAuthenticated]);

  const handleNavigate = (view) => {
    switch (view) {
      case 'home':
      case 'landing':
        navigate('/');
        break;
      case 'login':
        navigate('/login');
        break;
      case 'register':
        navigate('/register');
        break;
      case 'dashboard':
      case 'tts':
        navigate('/tts');
        break;
      case 'stt':
        navigate('/stt');
        break;
      case 'cloning':
        navigate('/voice-cloning');
        break;
      case 'image':
        navigate('/ai-image-gen');
        break;
      case 'about':
        navigate('/about');
        break;
      case 'plans':
        navigate('/plans');
        break;
      case 'forgot-password':
        navigate('/forgot-password');
        break;
      case 'reset-password':
        navigate('/reset-password');
        break;
      default:
        navigate('/');
    }
  };

  const handleLoginSuccess = () => {
    // No reload needed, rely on state update or explicit navigation from Login component
  };

  // Redirect Admin to /admin if they hit root or generic paths meant for users, 
  // but allow explicit navigation.
  // Original app forced AdminView for all authorized requests. 
  // We'll trust the routes, but we can default / to /admin for admins if we want.
  // For now, mapping / to Home.

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={
          <Home
            onNavigate={handleNavigate}
            userPlan={isAuthenticated ? userPlan : null}
            isLoggedIn={isAuthenticated}
          />
        } />

        <Route path="/login" element={
          isAuthenticated ? <Navigate to={isAdmin ? "/admin" : "/"} replace /> :
            <Login
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={() => navigate('/register')}
              onSwitchToForgotPassword={() => navigate('/forgot-password')}
            />
        } />

        <Route path="/register" element={
          isAuthenticated ? <Navigate to={isAdmin ? "/admin" : "/"} replace /> :
            <Register
              onSuccess={() => { setTimeout(() => navigate('/login'), 2000) }}
              onSwitchToLogin={() => navigate('/login')}
            />
        } />

        <Route path="/forgot-password" element={
          <ForgotPassword
            onBackToLogin={() => navigate('/login')}
            onSwitchToResetPassword={() => navigate('/reset-password')}
          />
        } />

        <Route path="/reset-password" element={
          <ResetPassword
            onBackToLogin={() => navigate('/login')}
          />
        } />

        <Route path="/dashboard" element={
          <Navigate to="/tts" replace />
        } />

        <Route path="/tts" element={
          <ProtectedRoute>
            <Dashboard userPlan={userPlan} onNavigate={handleNavigate} />
          </ProtectedRoute>
        } />

        <Route path="/stt" element={
          <ProtectedRoute>
            <ComingSoon onNavigate={handleNavigate} feature="Speech to Text" />
          </ProtectedRoute>
        } />

        <Route path="/voice-cloning" element={
          <ProtectedRoute>
            <ComingSoon onNavigate={handleNavigate} feature="Voice Cloning" />
          </ProtectedRoute>
        } />

        <Route path="/ai-image-gen" element={
          <ProtectedRoute>
            <ComingSoon onNavigate={handleNavigate} feature="AI Image Generation" />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute adminOnly={true}>
            <AdminView />
          </ProtectedRoute>
        } />

        <Route path="/about" element={<About onNavigate={handleNavigate} />} />
        <Route path="/plans" element={<Plans onNavigate={handleNavigate} />} />
        <Route path="/coming-soon" element={<ComingSoon onNavigate={handleNavigate} />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!location.pathname.startsWith('/admin') && (
        <Footer onNavigate={handleNavigate} />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
