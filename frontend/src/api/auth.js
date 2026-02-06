import axios from 'axios'

// Ensure we use the production domain with the /api prefix
const API_BASE_URL = "https://tts.testingprojects.online/api"

// Add timeout to axios requests
const axiosInstance = axios.create({
  timeout: 10000,
})

// NEW: Interceptor to handle session expiration (401) automatically
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid -> Logout user
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_email');
      localStorage.removeItem('conversionHistory');
      // Redirect to login (App.jsx will see no token and show Login)
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: async (email, password) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/signup`, {
        email,
        password
      })
      return response.data
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw { detail: 'Request timed out. Please check if the backend server is running.' }
      }
      throw error.response?.data || { detail: error.message || 'Signup failed' }
    }
  },

  login: async (email, password) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/login`, {
        email,
        password
      })
      localStorage.setItem('access_token', response.data.access_token)
      localStorage.setItem('user_email', email)
      return response.data
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw { detail: 'Request timed out. Please check if the backend server is running.' }
      }
      throw error.response?.data || { detail: error.message || 'Login failed' }
    }
  },

  // NEW: Function to fetch your downloads using the /api prefix
  getDownloads: async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axiosInstance.get(`${API_BASE_URL}/downloads`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { detail: 'Failed to fetch downloads' }
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('conversionHistory')
  },

  getToken: () => localStorage.getItem('access_token'),
  getUserEmail: () => localStorage.getItem('user_email'),
  isAuthenticated: () => !!localStorage.getItem('access_token'),

  forgotPassword: async (email) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/forgot-password`, {
        email
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { detail: 'Request failed' }
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/reset-password`, {
        token,
        new_password: newPassword
      })
      return response.data
    } catch (error) {
      throw error.response?.data || { detail: 'Reset password failed' }
    }
  }
}