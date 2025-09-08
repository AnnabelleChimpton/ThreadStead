import { useState, useEffect } from 'react'

export interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      default: return 'ℹ️'
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success': return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'text-green-600'
      }
      case 'error': return {
        bg: 'bg-red-50',
        border: 'border-red-200', 
        text: 'text-red-800',
        icon: 'text-red-600'
      }
      case 'warning': return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'text-yellow-600'
      }
      default: return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600'
      }
    }
  }

  const colors = getColors()

  return (
    <div
      className={`toast-container fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-md w-full mx-4 transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
        <div className={`${colors.bg} ${colors.border} ${colors.text} border-2 rounded-xl shadow-2xl p-6`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${colors.icon}`}>{getIcon()}</span>
              <h3 className="text-lg font-semibold">
                {type === 'success' && 'Success'}
                {type === 'error' && 'Error'}
                {type === 'warning' && 'Warning'}
                {type === 'info' && 'Information'}
              </h3>
            </div>
            <button
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none p-1"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
          
          {/* Message */}
          <p className="text-sm leading-relaxed mb-6">{message}</p>
          
          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setIsVisible(false)
                setTimeout(onClose, 300)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                type === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              OK
            </button>
          </div>
        </div>
    </div>
  )
}