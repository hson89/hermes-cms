"use client"

import React from 'react'
import { Icon } from '@/components/ui/atoms/Icon'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  content: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isConfirming?: boolean
  type?: 'danger' | 'warning' | 'info'
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  content,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isConfirming = false,
  type = 'danger',
}) => {
  if (!isOpen) return null

  const themeClasses = {
    danger: {
      text: 'text-red-600',
      bg: 'bg-red-500/10',
      icon: 'warning',
      iconColor: 'text-red-500',
      buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/20',
    },
    warning: {
      text: 'text-amber-600',
      bg: 'bg-amber-500/10',
      icon: 'warning',
      iconColor: 'text-amber-500',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/20',
    },
    info: {
      text: 'text-primary',
      bg: 'bg-primary/10',
      icon: 'info',
      iconColor: 'text-primary',
      buttonBg: 'bg-primary hover:bg-primary/95 focus:ring-primary/20',
    },
  }[type]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-fade-in">
      <div 
        className="bg-surface/90 backdrop-blur-[20px] max-w-md w-full rounded-2xl p-6 border border-outline-variant/15 shadow-2xl flex flex-col space-y-4 animate-fade-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-full ${themeClasses.bg} flex items-center justify-center`}>
            <Icon name={themeClasses.icon} size={20} className={themeClasses.iconColor} />
          </div>
          <h3 className="font-headline font-bold text-lg text-on-surface">{title}</h3>
        </div>

        {/* Content */}
        <div className="font-body text-xs text-outline leading-relaxed">
          {content}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
            className="border border-outline-variant/30 text-on-surface hover:bg-surface-container py-2.5 px-4.5 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent focus:outline-none"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className={`${themeClasses.buttonBg} text-white font-label font-bold text-xs uppercase tracking-widest py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none focus:outline-none`}
          >
            {isConfirming ? (
              <>
                Processing...
                <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
