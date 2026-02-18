import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/auth'
import toast from 'react-hot-toast'

export default function Register({ onSuccess, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email || !password || !confirmPassword) {
      toast.error('All fields are required')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    // Check byte length (bcrypt has 72-byte limit)
    const passwordBytes = new TextEncoder().encode(password).length
    if (passwordBytes > 72) {
      toast.error('Password cannot be longer than 72 bytes')
      return
    }

    setLoading(true)
    try {
      await authAPI.signup(email, password)
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      toast.success('Registration successful! Please login.')
      onSuccess()
      navigate('/login')
    } catch (err) {
      toast.error(err.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-md border border-gray-800">
        <h2 className="text-3xl font-bold text-center text-green-500 mb-8">Register</h2>

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

          <div>
            <label className="block text-gray-300 font-semibold mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-center text-gray-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-orange-500 hover:text-orange-400 font-bold underline"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
