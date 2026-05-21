import React, { useState, useRef } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { documentService } from '../services/documents'
import toast from 'react-hot-toast'

const ALLOWED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'text/plain': 'TXT',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/webp': 'WEBP',
  'image/tiff': 'TIFF',
}

export default function DocumentUpload({ projectId, onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!ALLOWED_TYPES[f.type]) {
      toast.error('Only PDF, DOCX, TXT, and image files (PNG, JPG, GIF, BMP, WEBP, TIFF) are supported')
      return
    }
    setFile(f)
    setStatus('idle')
    setErrorMsg('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus('uploading')
    setProgress(0)
    try {
      const doc = await documentService.upload(projectId, file, setProgress)
      setStatus('success')
      toast.success(`"${doc.filename}" uploaded and indexed (${doc.chunk_count} chunks)`)
      onUploaded(doc)
      setTimeout(() => {
        setFile(null)
        setStatus('idle')
        setProgress(0)
      }, 2000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.detail || 'Upload failed')
      toast.error('Upload failed')
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-primary-500 bg-primary-600/10'
            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff,.tif"
          className="hidden"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <Upload className="h-8 w-8 text-gray-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-300">Drop a file here or click to browse</p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, PNG, JPG, GIF, BMP, WEBP — up to 50MB</p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
            </div>
            {status === 'idle' && (
              <button onClick={() => setFile(null)} className="text-gray-500 hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            )}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}
            {status === 'uploading' && <Loader className="h-5 w-5 text-primary-400 animate-spin" />}
          </div>

          {status === 'uploading' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'error' && (
            <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
          )}

          {status === 'idle' && (
            <button onClick={handleUpload} className="btn-primary w-full mt-3 text-sm">
              Upload & Index Document
            </button>
          )}
        </div>
      )}
    </div>
  )
}
