import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projects'
import { documentService } from '../services/documents'
import Sidebar from '../components/Sidebar'
import DocumentUpload from '../components/DocumentUpload'
import DocumentList from '../components/DocumentList'
import AccessManager from '../components/AccessManager'
import GroupManager from '../components/GroupManager'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  ArrowLeft, MessageSquare, FileText, Upload, FolderOpen,
  ChevronRight, Layers, Calendar, ShieldCheck, Users
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [project, setProject] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('documents')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [proj, docs] = await Promise.all([
        projectService.get(id),
        documentService.list(id),
      ])
      setProject(proj)
      setDocuments(docs)
    } catch {
      toast.error('Failed to load project')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUploaded = (doc) => {
    setDocuments([doc, ...documents])
    setProject((p) => ({ ...p, document_count: (p.document_count || 0) + 1 }))
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar projects={project ? [project] : []} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Dashboard</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gray-200 font-medium">{project?.name}</span>
              </div>
            </div>
            <Link
              to={`/projects/${id}/chat`}
              className="btn-primary flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Open Chat
            </Link>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Project header */}
          <div className="card mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center border border-primary-600/30 flex-shrink-0">
                <FolderOpen className="h-6 w-6 text-primary-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">{project?.name}</h1>
                {project?.description && (
                  <p className="text-gray-400 text-sm mt-1">{project.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>{project?.document_count} documents</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>{project?.chat_count} chats</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Created {project && format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
            <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
              <FileText className="h-4 w-4" />
              Documents ({documents.length})
            </TabButton>
            {isAdmin && (
              <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>
                <Upload className="h-4 w-4" />
                Upload
              </TabButton>
            )}
            {isAdmin && (
              <TabButton active={activeTab === 'access'} onClick={() => setActiveTab('access')}>
                <ShieldCheck className="h-4 w-4" />
                Access
              </TabButton>
            )}
            {isAdmin && (
              <TabButton active={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>
                <Users className="h-4 w-4" />
                Groups
              </TabButton>
            )}
          </div>

          {/* Tab content */}
          {activeTab === 'documents' && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary-400" />
                Indexed Documents
              </h2>
              <DocumentList documents={documents} />
            </div>
          )}

          {activeTab === 'upload' && isAdmin && (
            <div className="card max-w-xl">
              <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary-400" />
                Upload Document
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Documents are indexed exclusively to this project. The AI will only use these documents when answering questions in this project.
              </p>
              <DocumentUpload projectId={id} onUploaded={handleDocumentUploaded} />
            </div>
          )}

          {activeTab === 'access' && isAdmin && (
            <div className="max-w-xl">
              <AccessManager projectId={id} />
            </div>
          )}

          {activeTab === 'groups' && isAdmin && (
            <div className="max-w-xl">
              <GroupManager />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      }`}
    >
      {children}
    </button>
  )
}
