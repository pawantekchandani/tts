import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'

export default function Login({ onSuccess, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user was redirected due to session expiry
    if (localStorage.getItem('session_expired')) {
      toast.error('Session expired. Please login again.');
      localStorage.removeItem('session_expired');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Email and password are required')
      return
    }

    setLoading(true)
    try {
      await authAPI.login(email, password)
      setEmail('')
      setPassword('')
      toast.success('Login successful!')
      onSuccess()

      const userEmail = authAPI.getUserEmail();
      if (userEmail && userEmail.toLowerCase() === 'admin@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      if (err.detail === 'Email is not registered') {
        toast.error('Email is not registered. Please register first.')
      } else {
        toast.error(err.detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-md border border-gray-800">
        <h2 className="text-3xl font-bold text-center text-green-500 mb-8">Start Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
              placeholder="••••••"
            />
          </div>

          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => onSwitchToForgotPassword()}
              className="text-sm text-orange-400 hover:text-orange-300 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-orange-500 hover:text-orange-400 font-bold underline"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
