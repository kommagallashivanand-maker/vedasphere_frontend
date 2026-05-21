import api from './api'

export const accessService = {
  // GET /users — all regular users (for the grant dropdown)
  listUsers: async () => {
    const { data } = await api.get('/users')
    return data
  },

  // GET /access/{projectId} — users who have access to a project
  listAccess: async (projectId) => {
    const { data } = await api.get(`/access/${projectId}`)
    return data
  },

  // POST /access/{projectId} — grant a user access
  grantAccess: async (projectId, userId) => {
    const { data } = await api.post(`/access/${projectId}`, { user_id: userId })
    return data
  },

  // POST /access/{projectId}/group — grant entire group access
  grantGroupAccess: async (projectId, groupId) => {
    const { data } = await api.post(`/access/${projectId}/group`, { group_id: groupId })
    return data
  },

  // DELETE /access/{projectId}/{userId} — revoke access
  revokeAccess: async (projectId, userId) => {
    await api.delete(`/access/${projectId}/${userId}`)
  },
}
