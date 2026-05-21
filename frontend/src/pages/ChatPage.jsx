import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projects'
import { chatService } from '../services/chat'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  ArrowLeft, Send, Bot, User, ChevronDown, ChevronUp,
  FileText, Sparkles, FolderOpen, MessageSquare, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const loadData = async () => {
    try {
      const [proj, history] = await Promise.all([
        projectService.get(id),
        chatService.getHistory(id),
      ])
      setProject(proj)
      // Convert history to message pairs
      const msgs = history.flatMap((chat) => [
        { id: `q-${chat.id}`, role: 'user', content: chat.question, timestamp: chat.created_at },
        { id: `a-${chat.id}`, role: 'assistant', content: chat.answer, sources: chat.sources || [], timestamp: chat.created_at },
      ])
      setMessages(msgs)
    } catch {
      toast.error('Failed to load chat')
      navigate(isAdmin ? `/projects/${id}` : '/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    const question = input.trim()
    if (!question || sending) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const response = await chatService.sendMessage(id, question)
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
        timestamp: response.created_at,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: err.response?.data?.detail || 'Something went wrong. Please try again.',
        sources: [],
        isError: true,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => navigate(isAdmin ? `/projects/${id}` : '/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors text-sm mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            {isAdmin ? 'Back to Project' : 'Back to Dashboard'}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-primary-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{project?.name}</p>
              <p className="text-xs text-gray-500">{project?.document_count} documents</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Isolation Notice
          </p>
          <div className="bg-primary-600/10 border border-primary-600/20 rounded-xl p-3 text-xs text-primary-300">
            <Sparkles className="h-3.5 w-3.5 mb-1.5" />
            This AI only accesses documents from <strong>{project?.name}</strong>. No other project data is used.
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Quick Actions
            </p>
            {isAdmin && (
              <Link
                to={`/projects/${id}`}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Manage Documents
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">{project?.name} — AI Assistant</h1>
            <p className="text-xs text-gray-500">Answers based on your uploaded documents only</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-16 h-16 bg-primary-600/20 rounded-2xl flex items-center justify-center mb-4 border border-primary-600/30">
                <MessageSquare className="h-8 w-8 text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-200 mb-2">Ask anything about your documents</h2>
              <p className="text-gray-500 text-sm max-w-sm">
                The AI will search through the {project?.document_count} document(s) in this project to answer your question.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {sending && (
            <div className="flex gap-4 max-w-3xl mx-auto w-full">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Searching documents...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-primary-500 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask a question about ${project?.name}...`}
                rows={1}
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none text-sm leading-relaxed max-h-32"
                style={{ minHeight: '24px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ message }) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 max-w-3xl mx-auto w-full ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
        isUser ? 'bg-gray-700' : message.isError ? 'bg-red-600/20' : 'bg-primary-600'
      }`}>
        {isUser
          ? <User className="h-4 w-4 text-gray-300" />
          : message.isError
            ? <AlertCircle className="h-4 w-4 text-red-400" />
            : <Bot className="h-4 w-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-sm max-w-lg'
            : message.isError
              ? 'bg-red-900/20 border border-red-700/30 text-red-300 rounded-tl-sm'
              : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm'
        }`}>
          {message.content}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <FileText className="h-3 w-3" />
              <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''} used</span>
              {showSources ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showSources && (
              <div className="mt-2 space-y-2">
                {message.sources.map((source, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-3 w-3 text-primary-400 flex-shrink-0" />
                      <span className="font-medium text-gray-300 truncate">{source.document}</span>
                      {source.page && (
                        <span className="text-gray-600 flex-shrink-0">· Page {source.page}</span>
                      )}
                      {source.relevance_score && (
                        <span className="ml-auto text-gray-600 flex-shrink-0">
                          {Math.round(source.relevance_score * 100)}% match
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 line-clamp-2">{source.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-1.5 px-1">
          {format(new Date(message.timestamp), 'h:mm a')}
        </p>
      </div>
    </div>
  )
}
