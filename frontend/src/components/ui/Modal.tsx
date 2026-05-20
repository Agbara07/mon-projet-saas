'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({ open, onClose, title, description, children, className, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full mx-4 rounded-2xl',
            'bg-[#0f0f0f] border border-white/[0.08] shadow-2xl',
            'animate-scale-in',
            sizeMap[size],
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
              <div>
                {title && <Dialog.Title className="font-bold text-white text-lg">{title}</Dialog.Title>}
                {description && <Dialog.Description className="text-zinc-400 text-sm mt-1">{description}</Dialog.Description>}
              </div>
              <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors ml-4 mt-0.5">
                <X size={18}/>
              </button>
            </div>
          )}
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
