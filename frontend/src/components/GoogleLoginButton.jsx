import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';

export default function GoogleLoginButton({ onSuccess }) {
    const [loading, setLoading] = useState(false);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                const BASE_URL = import.meta.env.VITE_API_URL || "https://tts.testingprojects.online";

                // useGoogleLogin returns an access_token. We send this to the backend.
                // The backend will hit Google's userinfo endpoint to verify it rather than id_token logic.
                const response = await axios.post(`${BASE_URL}/api/auth/google`, {
                    token: tokenResponse.access_token
                });
                // Store standard session details
                localStorage.setItem('access_token', response.data.access_token);
                localStorage.setItem('user_plan', response.data.plan_type || 'Basic');

                // Fetch profile to make sure the user_email is updated
                const profile = await axios.get(`${BASE_URL}/api/me`, {
                    headers: { Authorization: `Bearer ${response.data.access_token}` }
                });
                localStorage.setItem('user_email', profile.data.email);

                toast.success('Google Login successful!');
                if (onSuccess) onSuccess();
            } catch (err) {
                console.error("Google Login Error:", err);
                toast.error(err.response?.data?.detail || 'Google Login failed');
            } finally {
                setLoading(false);
            }
        },
        onError: (error) => {
            console.error("Google Login Hook Error:", error);
            toast.error('Google Auth flow failed');
        }
    });

    return (
        <button
            onClick={() => login()}
            disabled={loading}
            type="button"
            className="w-full bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 disabled:opacity-50 font-bold py-2 px-4 rounded-lg shadow-sm transition duration-200 flex items-center justify-center space-x-3 mb-4"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
        </button>
    );
}
