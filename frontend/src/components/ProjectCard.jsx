import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FolderOpen, FileText, MessageSquare, Trash2, ChevronRight, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export default function ProjectCard({ project, onDelete }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await onDelete(project.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleClick = () => {
    if (isAdmin) {
      navigate(`/projects/${project.id}`)
    } else {
      navigate(`/projects/${project.id}/chat`)
    }
  }

  return (
    <div
      onClick={handleClick}
      className="card cursor-pointer hover:border-primary-600/50 hover:bg-gray-800/50 transition-all duration-200 group relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center border border-primary-600/30">
            <FolderOpen className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-gray-600 hover:text-red-400 transition-all p-1 rounded ${
            isAdmin ? 'opacity-0 group-hover:opacity-100' : 'hidden'
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          <span>{project.document_count} docs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          <span>{project.chat_count} chats</span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs">Open</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  )
}
