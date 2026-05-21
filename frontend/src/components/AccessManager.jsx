import React, { useState, useEffect } from 'react'
import { accessService } from '../services/access'
import { groupService } from '../services/groups'
import { UserPlus, UserMinus, Users, ShieldCheck, Briefcase, Building2, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

export default function AccessManager({ projectId }) {
  const [grantedUsers, setGrantedUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [granting, setGranting] = useState(false)
  const [grantingGroup, setGrantingGroup] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      const [granted, users, grps] = await Promise.all([
        accessService.listAccess(projectId),
        accessService.listUsers(),
        groupService.list(),
      ])
      setGrantedUsers(granted)
      setAllUsers(users)
      setGroups(grps)
    } catch {
      toast.error('Failed to load access list')
    } finally {
      setLoading(false)
    }
  }

  const grantedIds = new Set(grantedUsers.map((u) => u.id))
  const availableUsers = allUsers.filter((u) => !grantedIds.has(u.id))

  const handleGrant = async () => {
    if (!selectedUserId) return
    setGranting(true)
    try {
      await accessService.grantAccess(projectId, parseInt(selectedUserId))
      const user = allUsers.find((u) => u.id === parseInt(selectedUserId))
      toast.success(`Access granted to ${user?.name}`)
      setSelectedUserId('')
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to grant access')
    } finally {
      setGranting(false)
    }
  }

  const handleGrantGroup = async () => {
    if (!selectedGroupId) return
    setGrantingGroup(true)
    try {
      const res = await accessService.grantGroupAccess(projectId, parseInt(selectedGroupId))
      toast.success(res.detail)
      setSelectedGroupId('')
      await loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to grant group access')
    } finally {
      setGrantingGroup(false)
    }
  }

  const handleRevoke = async (userId, userName) => {
    if (!window.confirm(`Revoke access for ${userName}?`)) return
    try {
      await accessService.revokeAccess(projectId, userId)
      toast.success(`Access revoked for ${userName}`)
      setGrantedUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to revoke access')
    }
  }

  if (loading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  return (
    <div className="space-y-5">

      {/* Grant by group */}
      {groups.length > 0 && (
        <div className="card border-primary-600/20">
          <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-400" />
            Grant Access by Group
          </h3>
          <div className="flex gap-3">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Select a group...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.member_count} member{g.member_count !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
            <button
              onClick={handleGrantGroup}
              disabled={!selectedGroupId || grantingGroup}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Users className="h-4 w-4" />
              {grantingGroup ? 'Granting...' : 'Grant Group'}
            </button>
          </div>
        </div>
      )}

      {/* Grant individual user */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary-400" />
          Grant Individual Access
        </h3>
        {availableUsers.length === 0 ? (
          <p className="text-sm text-gray-500">All registered users already have access.</p>
        ) : (
          <div className="flex gap-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Select a user...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.job_title ? ` — ${u.job_title}` : ''}{u.department ? ` (${u.department})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleGrant}
              disabled={!selectedUserId || granting}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              {granting ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
        )}
      </div>

      {/* Users with access */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary-400" />
          Users with Access
          <span className="ml-auto text-xs text-gray-500 font-normal">
            {grantedUsers.length} user{grantedUsers.length !== 1 ? 's' : ''}
          </span>
        </h3>

        {grantedUsers.length === 0 ? (
          <div className="text-center py-8">
            <ShieldCheck className="h-8 w-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No users have been granted access yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {grantedUsers.map((u) => {
              const profile = allUsers.find((au) => au.id === u.id)
              return (
                <div key={u.id}
                  className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary-400">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{u.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{u.email}</span>
                        {profile?.job_title && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Briefcase className="h-3 w-3" />{profile.job_title}
                          </span>
                        )}
                        {profile?.department && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" />{profile.department}
                          </span>
                        )}
                        {profile?.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />{profile.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(u.id, u.name)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-900/20"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
