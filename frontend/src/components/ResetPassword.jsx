import { useState, useEffect } from 'react'
import { authAPI } from '../api/auth'

export default function ResetPassword({ onBackToLogin }) {
    const [token, setToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // extract token from URL query params
        const params = new URLSearchParams(window.location.search)
        const tokenFromUrl = params.get('token')
        if (tokenFromUrl) {
            setToken(tokenFromUrl)
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')

        if (!token || !newPassword) {
            setError('Token and new password are required')
            return
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            await authAPI.resetPassword(token, newPassword)
            setMessage('Password reset successful! You can now login.')
            // Optionally clear form or redirect
            setToken('')
            setNewPassword('')
        } catch (err) {
            setError(err.detail || 'Failed to reset password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg shadow-2xl p-8 w-full max-w-md border border-gray-800">
                <h2 className="text-3xl font-bold text-center text-orange-500 mb-8">Reset Password</h2>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-300 font-semibold mb-2">Reset Token</label>
                        <input
                            type="text"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
                            placeholder="Paste your token here"
                            readOnly={!!new URLSearchParams(window.location.search).get('token')}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-300 font-semibold mb-2">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-500"
                            placeholder="••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-800">
                    <button
                        onClick={onBackToLogin}
                        className="w-full text-center text-orange-400 hover:text-orange-300 font-bold"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    )
}
