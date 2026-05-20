import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refreshToken')
      if (refresh) {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: refresh })
        localStorage.setItem('accessToken', data.accessToken)
        error.config.headers.Authorization = `Bearer ${data.accessToken}`
        return api(error.config)
      }
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
