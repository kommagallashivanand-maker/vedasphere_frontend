import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectService } from '../services/projects'
import { chatService } from '../services/chat'
import LoadingSpinner from '../components/LoadingSpinner'
import TypingAnimation from '../components/TypingAnimation'
import {
  ArrowLeft, Send, Bot, User, ChevronDown, ChevronUp,
  FileText, Sparkles, FolderOpen, MessageSquare, AlertCircle, Copy, Check
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
  const [typingMessageId, setTypingMessageId] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
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
        isTyping: true,
      }
      setMessages((prev) => [...prev, assistantMsg])
      setTypingMessageId(assistantMsg.id)
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

  const handleTypingComplete = (messageId) => {
    setTypingMessageId(null)
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isTyping: false } : msg
      )
    )
  }

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800/50 flex flex-col">
        <div className="p-6 border-b border-gray-800/50">
          <button
            onClick={() => navigate(isAdmin ? `/projects/${id}` : '/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-primary-400 transition-colors text-sm mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            {isAdmin ? 'Back to Project' : 'Back to Dashboard'}
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-base font-semibold text-white truncate">{project?.name}</p>
              <p className="text-xs text-gray-500">{project?.document_count} documents indexed</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Context Isolation
            </p>
            <div className="bg-gradient-to-br from-primary-600/10 to-primary-500/5 border border-primary-500/20 rounded-2xl p-4 text-xs text-primary-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <Sparkles className="h-4 w-4 mb-2 relative z-10" />
              <p className="relative z-10 leading-relaxed">
                This AI assistant only has access to documents from <strong className="text-primary-200">{project?.name}</strong>. 
                No other project data is visible or used.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </p>
            {isAdmin && (
              <Link
                to={`/projects/${id}`}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white py-3 px-4 rounded-xl hover:bg-gray-800/50 transition-all group"
              >
                <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Manage Documents</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Chat header */}
        <div className="relative bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/50 px-8 py-5 flex items-center gap-4 shadow-lg">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">{project?.name} AI Assistant</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Ready to answer your questions
            </p>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-8 relative"
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary-500/20 rounded-3xl blur-2xl" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/30">
                    <MessageSquare className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-100 mb-3">Start a conversation</h2>
                <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                  Ask anything about your documents. The AI will search through {project?.document_count} document(s) 
                  to provide accurate answers with source citations.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onTypingComplete={() => handleTypingComplete(msg.id)}
              />
            ))}

            {sending && (
              <div className="flex gap-4 animate-fadeIn">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30 relative">
                  <Bot className="h-5 w-5 text-white relative z-10" />
                  <div className="absolute inset-0 rounded-2xl bg-primary-400 animate-ping opacity-20" />
                </div>
                <div className="flex-1 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-3xl rounded-tl-md px-6 py-5 max-w-3xl">
                  <div className="space-y-4">
                    {/* Main status */}
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm font-medium">Analyzing documents...</span>
                    </div>
                    
                    {/* Document scanning animation */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText className="h-3.5 w-3.5 text-primary-400 animate-pulse" />
                        <span>Scanning document collection</span>
                        <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden ml-2">
                          <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-scan" style={{ width: '40%' }} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Sparkles className="h-3.5 w-3.5 text-primary-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                        <span>Extracting relevant information</span>
                        <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden ml-2">
                          <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-scan" style={{ width: '60%', animationDelay: '300ms' }} />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Bot className="h-3.5 w-3.5 text-primary-400 animate-pulse" style={{ animationDelay: '400ms' }} />
                        <span>Generating response</span>
                        <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden ml-2">
                          <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-scan" style={{ width: '30%', animationDelay: '600ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="relative border-t border-gray-800/50 bg-gray-900/60 backdrop-blur-xl p-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="flex gap-3 items-center bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-3xl px-5 py-4 focus-within:border-primary-500/50 focus-within:shadow-lg focus-within:shadow-primary-500/10 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask anything about ${project?.name}...`}
                  rows={1}
                  className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none text-sm leading-relaxed max-h-32 text-center placeholder:text-center"
                  style={{ minHeight: '24px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                  }}
                  onFocus={(e) => e.target.classList.remove('text-center')}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.classList.add('text-center')
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105"
                >
                  <Send className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mt-3">
              Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to send · 
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 ml-1">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ message, onTypingComplete }) {
  const [showSources, setShowSources] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      toast.success('Response copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy response')
    }
  }

  return (
    <div className={`flex gap-4 w-full animate-fadeIn ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 mt-1 ${isUser ? '' : ''}`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
          isUser 
            ? 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-gray-700/30' 
            : message.isError 
              ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/30' 
              : 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/30'
        }`}>
          {isUser
            ? <User className="h-5 w-5 text-gray-200" />
            : message.isError
              ? <AlertCircle className="h-5 w-5 text-white" />
              : <Bot className="h-5 w-5 text-white" />
          }
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Message bubble */}
        <div className={`group relative ${isUser ? 'max-w-2xl' : ''}`}>
          <div className={`px-6 py-4 text-sm leading-relaxed shadow-lg relative ${
            isUser
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-3xl rounded-tr-md'
              : message.isError
                ? 'bg-gradient-to-br from-red-900/40 to-red-900/20 backdrop-blur-sm border border-red-700/30 text-red-200 rounded-3xl rounded-tl-md'
                : 'bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 text-gray-100 rounded-3xl rounded-tl-md'
          }`}>
            <div className="whitespace-pre-wrap break-words">
              {!isUser && message.isTyping ? (
                <TypingAnimation 
                  text={message.content} 
                  speed={15}
                  onComplete={onTypingComplete}
                />
              ) : (
                message.content
              )}
            </div>

            {/* Copy button - only for assistant messages */}
            {!isUser && !message.isError && !message.isTyping && (
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 rounded-lg bg-gray-700/0 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Copy response"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Timestamp */}
          <p className={`text-xs text-gray-600 mt-2 px-2 ${isUser ? 'text-right' : ''}`}>
            {format(new Date(message.timestamp), 'h:mm a')}
          </p>
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && !message.isTyping && (
          <div className="mt-4 w-full animate-fadeIn">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-primary-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-800/30"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium">{message.sources.length} source{message.sources.length > 1 ? 's' : ''} referenced</span>
              {showSources ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showSources && (
              <div className="mt-3 space-y-3">
                {message.sources.map((source, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/40 rounded-2xl p-4 text-xs hover:border-primary-500/30 transition-all animate-fadeIn"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-200 truncate">{source.document}</span>
                          {source.page && (
                            <span className="text-gray-500 text-xs bg-gray-700/30 px-2 py-0.5 rounded-full">
                              Page {source.page}
                            </span>
                          )}
                          {source.relevance_score && (
                            <span className="ml-auto text-gray-500 text-xs bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded-full flex-shrink-0">
                              {Math.round(source.relevance_score * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-400 leading-relaxed line-clamp-3 pl-11">{source.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
