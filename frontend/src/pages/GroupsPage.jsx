import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projects'
import Sidebar from '../components/Sidebar'
import GroupManager from '../components/GroupManager'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function GroupsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const allProjects = await projectService.list()
      setProjects(allProjects)
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
      <Sidebar projects={projects} />
      <main className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/50 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Groups</h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage shared user groups for project access across your workspace.
              </p>
            </div>
            <div className="rounded-3xl border border-gray-800/60 bg-gray-900/60 px-4 py-2 text-sm text-gray-300">
              {user?.name}
              {user?.role === 'admin' && ' · Admin'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <GroupManager />
          </div>
        </div>
      </main>
    </div>
  )
}
