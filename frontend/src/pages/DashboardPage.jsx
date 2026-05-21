import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projects'
import Sidebar from '../components/Sidebar'
import ProjectCard from '../components/ProjectCard'
import CreateProjectModal from '../components/CreateProjectModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { Plus, FolderOpen, Search, Brain } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectService.list()
      setProjects(data)
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (name, description) => {
    const project = await projectService.create(name, description)
    setProjects([project, ...projects])
    toast.success('Project created!')
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

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar projects={projects} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.name}</p>
            </div>
            {user?.role === 'admin' && (
              <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </button>
            )}
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={<FolderOpen className="h-5 w-5 text-primary-400" />}
              label="Total Projects"
              value={projects.length}
              bg="bg-primary-600/10"
            />
            <StatCard
              icon={<Brain className="h-5 w-5 text-purple-400" />}
              label="Total Documents"
              value={projects.reduce((s, p) => s + (p.document_count || 0), 0)}
              bg="bg-purple-600/10"
            />
            <StatCard
              icon={<Brain className="h-5 w-5 text-green-400" />}
              label="Total Chats"
              value={projects.reduce((s, p) => s + (p.chat_count || 0), 0)}
              bg="bg-green-600/10"
            />
          </div>

          {/* Search */}
          {projects.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="input-field pl-10 max-w-sm"
              />
            </div>
          )}

          {/* Projects grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                {search ? 'No projects match your search' : 'No projects yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {search
                  ? 'Try a different search term'
                  : user?.role === 'admin'
                    ? 'Create your first project to start building a knowledge base'
                    : 'No projects are available yet. Ask your admin to create one.'}
              </p>
              {!search && user?.role === 'admin' && (
                <button onClick={() => setShowModal(true)} className="btn-primary">
                  Create First Project
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && user?.role === 'admin' && (
        <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}
