import { useState } from 'react'
import { authAPI } from '../api/auth'

export default function ForgotPassword({ onBackToLogin, onSwitchToResetPassword }) {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [token, setToken] = useState('') // For demonstration purposes

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setToken('')

        if (!email) {
            setError('Email is required')
            return
        }

        setLoading(true)
        try {
            const response = await authAPI.forgotPassword(email)
            setMessage(response.message)
            if (response.token) {
                setToken(response.token)
            }
        } catch (err) {
            setError(err.detail || 'Failed to request password reset')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-md border border-gray-800">
                <h2 className="text-3xl font-bold text-center text-orange-500 mb-8">Forgot Password</h2>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
                        {message}
                        {token && (
                            <div className="mt-2 text-sm break-all font-mono bg-gray-800 p-2 rounded border border-gray-700 text-gray-300">
                                <strong>Dev Note:</strong> Token: {token}
                            </div>
                        )}
                    </div>
                )}

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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col space-y-2">
                    <button
                        onClick={onSwitchToResetPassword}
                        className="w-full text-center text-orange-400 hover:text-orange-300 font-bold"
                    >
                        I already have a token
                    </button>
                    <button
                        onClick={onBackToLogin}
                        className="w-full text-center text-gray-500 hover:text-gray-400 font-bold"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    )
}
