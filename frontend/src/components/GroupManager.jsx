import React, { useState, useEffect } from 'react'
import { groupService } from '../services/groups'
import { accessService } from '../services/access'
import {
  Users, Plus, Trash2, UserPlus, UserMinus,
  ChevronDown, ChevronUp, Briefcase, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

export default function GroupManager() {
  const [groups, setGroups] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [groupDetails, setGroupDetails] = useState({}) // groupId -> detail
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [grps, users] = await Promise.all([
        groupService.list(),
        accessService.listUsers(),
      ])
      setGroups(grps)
      setAllUsers(users)
    } catch {
      toast.error('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = async (groupId) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null)
      return
    }
    setExpandedGroup(groupId)
    if (!groupDetails[groupId]) {
      try {
        const detail = await groupService.get(groupId)
        setGroupDetails((prev) => ({ ...prev, [groupId]: detail }))
      } catch {
        toast.error('Failed to load group members')
      }
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newGroup.name.trim()) return
    setCreating(true)
    try {
      const group = await groupService.create(newGroup.name.trim(), newGroup.description.trim() || null)
      setGroups([group, ...groups])
      setNewGroup({ name: '', description: '' })
      setShowCreateForm(false)
      toast.success(`Group "${group.name}" created`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (groupId, groupName) => {
    if (!window.confirm(`Delete group "${groupName}"? This cannot be undone.`)) return
    try {
      await groupService.delete(groupId)
      setGroups(groups.filter((g) => g.id !== groupId))
      if (expandedGroup === groupId) setExpandedGroup(null)
      toast.success(`Group "${groupName}" deleted`)
    } catch {
      toast.error('Failed to delete group')
    }
  }

  const handleAddMember = async (groupId, userId) => {
    try {
      await groupService.addMember(groupId, userId)
      const detail = await groupService.get(groupId)
      setGroupDetails((prev) => ({ ...prev, [groupId]: detail }))
      setGroups((prev) =>
        prev.map((g) => g.id === groupId ? { ...g, member_count: detail.members.length } : g)
      )
      toast.success('Member added')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (groupId, userId, userName) => {
    try {
      await groupService.removeMember(groupId, userId)
      setGroupDetails((prev) => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          members: prev[groupId].members.filter((m) => m.id !== userId),
        },
      }))
      setGroups((prev) =>
        prev.map((g) => g.id === groupId ? { ...g, member_count: g.member_count - 1 } : g)
      )
      toast.success(`${userName} removed from group`)
    } catch {
      toast.error('Failed to remove member')
    }
  }

  if (loading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary-400" />
          Groups
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          New Group
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="card space-y-3 border-primary-600/30">
          <p className="text-sm font-medium text-gray-200">Create New Group</p>
          <input
            type="text"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            placeholder="Group name (e.g. Frontend Team)"
            className="input-field"
            autoFocus
            required
          />
          <textarea
            value={newGroup.description}
            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="input-field resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary flex-1">
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="card text-center py-10">
          <Users className="h-8 w-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No groups yet. Create one to manage team access.</p>
        </div>
      ) : (
        groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            expanded={expandedGroup === group.id}
            detail={groupDetails[group.id]}
            allUsers={allUsers}
            onToggle={() => toggleExpand(group.id)}
            onDelete={() => handleDelete(group.id, group.name)}
            onAddMember={(userId) => handleAddMember(group.id, userId)}
            onRemoveMember={(userId, name) => handleRemoveMember(group.id, userId, name)}
          />
        ))
      )}
    </div>
  )
}

function GroupCard({ group, expanded, detail, allUsers, onToggle, onDelete, onAddMember, onRemoveMember }) {
  const [selectedUser, setSelectedUser] = useState('')

  const memberIds = new Set((detail?.members || []).map((m) => m.id))
  const available = allUsers.filter((u) => !memberIds.has(u.id))

  return (
    <div className="card">
      {/* Group header */}
      <div className="flex items-center justify-between">
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left">
          <div className="w-9 h-9 bg-primary-600/20 rounded-lg flex items-center justify-center border border-primary-600/30 flex-shrink-0">
            <Users className="h-4 w-4 text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-200">{group.name}</p>
            {group.description && (
              <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
            )}
          </div>
          <span className="ml-2 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
          <span className="ml-auto text-gray-500">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        <button
          onClick={onDelete}
          className="ml-3 text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-900/20"
          title="Delete group"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-800 pt-4">
          {/* Add member */}
          {available.length > 0 && (
            <div className="flex gap-2">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input-field flex-1 text-sm"
              >
                <option value="">Add a member...</option>
                {available.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.job_title ? ` — ${u.job_title}` : ''}{u.department ? ` (${u.department})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => { if (selectedUser) { onAddMember(parseInt(selectedUser)); setSelectedUser('') } }}
                disabled={!selectedUser}
                className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                Add
              </button>
            </div>
          )}

          {/* Members list */}
          {!detail ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : detail.members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.members.map((member) => (
                <div key={member.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-300">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">{member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {member.job_title && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Briefcase className="h-3 w-3" />{member.job_title}
                          </span>
                        )}
                        {member.department && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" />{member.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveMember(member.id, member.name)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-900/20"
                    title="Remove from group"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
