import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Brain,
  User,
} from 'lucide-react'

export default function Sidebar({ projects = [] }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <aside
      className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } min-h-screen`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="VedaSphere" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">VedaSphere</p>
            <p className="text-xs text-gray-500 truncate">Assistant</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NavItem
          to="/dashboard"
          icon={<LayoutDashboard className="h-5 w-5" />}
          label="Dashboard"
          collapsed={collapsed}
          active={location.pathname === '/dashboard'}
        />

        {projects.length > 0 && !collapsed && (
          <div className="pt-4 pb-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</p>
          </div>
        )}

        {projects.map((project) => (
          <NavItem
            key={project.id}
            to={`/projects/${project.id}`}
            icon={<FolderOpen className="h-5 w-5" />}
            label={project.name}
            collapsed={collapsed}
            active={isActive(`/projects/${project.id}`)}
          />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-3">
        <div className={`flex items-center gap-3 px-2 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex-shrink-0 w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className={`text-xs truncate capitalize font-medium ${
                user?.role === 'admin' ? 'text-primary-400' : 'text-gray-500'
              }`}>
                {user?.role === 'admin' ? '⚡ Admin' : 'User'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center mt-2 text-gray-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

function NavItem({ to, icon, label, collapsed, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group ${
        active
          ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      } ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
    </Link>
  )
}
