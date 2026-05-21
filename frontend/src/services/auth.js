import api from './api'

export const authService = {
  register: async (name, email, password, { job_title, department, phone, bio } = {}) => {
    const { data } = await api.post('/auth/register', {
      name, email, password, job_title, department, phone, bio,
    })
    return data
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me')
    return data
  },
}
