import React from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectPage from './pages/ProjectPage'
import ChatPage from './pages/ChatPage'
import GitHubCallback from './pages/GitHubCallback'
import LoadingSpinner from './components/LoadingSpinner'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  return user ? <Navigate to="/dashboard" replace /> : children
}

/** Blocks non-admin users from accessing a route. */
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

/** Redirects regular users from project detail to chat directly. */
function ProjectRoute() {
  const { user, loading } = useAuth()
  const { id } = useParams()
  if (loading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to={`/projects/${id}/chat`} replace />
  return <ProjectPage />
}
//added
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/github/callback" element={<PrivateRoute><GitHubCallback /></PrivateRoute>} />
      {/* Project detail — admin only; users are redirected to chat */}
      <Route path="/groups" element={<AdminRoute><GroupsPage /></AdminRoute>} />
      <Route path="/projects/:id" element={<ProjectRoute />} />
      <Route path="/projects/:id/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
