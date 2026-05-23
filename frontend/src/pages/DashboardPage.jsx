import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { projectService } from '../services/projects'
import { accessService } from '../services/access'
import { groupService } from '../services/groups'
import Sidebar from '../components/Sidebar'
import ProjectCard from '../components/ProjectCard'
import CreateProjectModal from '../components/CreateProjectModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { Plus, FolderOpen, Search, Users, Layers, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const [projects, setProjects] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [groupCount, setGroupCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      if (isAdmin) {
        const [projectData, userData, groupData] = await Promise.all([
          projectService.list(),
          accessService.listUsers(),
          groupService.list(),
        ])
        setProjects(projectData)
        setUserCount(userData.length)
        setGroupCount(groupData.length)
      } else {
        const projectData = await projectService.list()
        setProjects(projectData)
      }
    } catch {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (name, description) => {
    const project = await projectService.create(name, description)
    setProjects([project, ...projects])
    toast.success('Project created!')
    navigate(`/projects/${project.id}`)
  }

  const handleDelete = async (id) => {
    await projectService.delete(id)
    setProjects(projects.filter((p) => p.id !== id))
    toast.success('Project deleted')
  }

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  // Most recently active project for admin (last in list = oldest, first = newest)
  const latestProject = isAdmin && projects.length > 0 ? projects[0] : null

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
      <Sidebar projects={projects} />

      <main className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex-shrink-0 bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/50 px-8 py-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
              <p className="text-sm text-gray-400">
                Welcome back, <span className="text-primary-400 font-medium">{user?.name}</span>
                
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            )}
          </div>
        </div>

        {/* Admin stats */}
        {isAdmin && (
          <div className="flex-shrink-0 px-8 py-6 bg-gray-900/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                icon={<FolderOpen className="h-6 w-6 text-primary-400" />}
                label="Projects"
                value={projects.length}
                sub="you manage"
                gradient="from-primary-500/20 to-primary-600/10"
                iconBg="bg-primary-500/10"
              />
              <StatCard
                icon={<Users className="h-6 w-6 text-purple-400" />}
                label="Registered Users"
                value={userCount}
                sub="available to assign"
                gradient="from-purple-500/20 to-purple-600/10"
                iconBg="bg-purple-500/10"
              />
              <StatCard
                icon={<Layers className="h-6 w-6 text-emerald-400" />}
                label="Groups"
                value={groupCount}
                sub="saved for quick access"
                gradient="from-emerald-500/20 to-emerald-600/10"
                iconBg="bg-emerald-500/10"
              />
            </div>

            {/* Latest project callout */}
            {latestProject && (
              <div
                onClick={() => navigate(`/projects/${latestProject.id}`)}
                className="mt-4 flex items-center gap-4 px-5 py-3.5 bg-gray-800/40 border border-gray-700/40 rounded-2xl cursor-pointer hover:border-primary-600/40 hover:bg-gray-800/60 transition-all group"
              >
                <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="h-4 w-4 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">Most recent project</p>
                  <p className="text-sm font-medium text-gray-200 truncate">{latestProject.name}</p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-3 flex-shrink-0">
                  <span>{latestProject.document_count} doc{latestProject.document_count !== 1 ? 's' : ''}</span>
                  <span className="text-gray-700">·</span>
                  <span>{latestProject.chat_count} chat{latestProject.chat_count !== 1 ? 's' : ''}</span>
                  <span className="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1">Open →</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User greeting strip (no stats) */}
        {!isAdmin && projects.length > 0 && (
          <div className="flex-shrink-0 px-8 pt-6 pb-2">
            <p className="text-sm text-gray-500">
              You have access to <span className="text-gray-300 font-medium">{projects.length}</span> project{projects.length !== 1 ? 's' : ''}. Click one to start chatting.
            </p>
          </div>
        )}

        {/* Search */}
        {projects.length > 0 && (
          <div className="flex-shrink-0 px-8 py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full max-w-sm bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 text-gray-100 rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 placeholder-gray-500 transition-all text-sm"
              />
            </div>
          </div>
        )}

        {/* Projects grid */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative mb-6 inline-block">
                <div className="absolute inset-0 bg-primary-500/20 rounded-3xl blur-2xl" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center border border-gray-700/50">
                  <FolderOpen className="h-10 w-10 text-gray-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                {search ? 'No projects match your search' : 'No projects yet'}
              </h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                {search
                  ? 'Try a different search term'
                  : isAdmin
                    ? 'Create your first project to start building a knowledge base'
                    : "You don't have access to any projects yet. Ask your admin to grant you access."}
              </p>
              {!search && isAdmin && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105"
                >
                  Create First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && isAdmin && (
        <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, gradient, iconBg }) {
  return (
    <div className="relative bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-6 overflow-hidden group hover:border-gray-600/50 transition-all">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform`} />
      <div className="relative flex items-center gap-4">
        <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-300 font-medium">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  )
}
