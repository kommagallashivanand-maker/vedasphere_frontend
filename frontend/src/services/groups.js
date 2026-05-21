import api from './api'

export const groupService = {
  list: async () => {
    const { data } = await api.get('/groups')
    return data
  },

  get: async (groupId) => {
    const { data } = await api.get(`/groups/${groupId}`)
    return data
  },

  create: async (name, description) => {
    const { data } = await api.post('/groups', { name, description })
    return data
  },

  delete: async (groupId) => {
    await api.delete(`/groups/${groupId}`)
  },

  addMember: async (groupId, userId) => {
    const { data } = await api.post(`/groups/${groupId}/members`, { user_id: userId })
    return data
  },

  removeMember: async (groupId, userId) => {
    await api.delete(`/groups/${groupId}/members/${userId}`)
  },
}
