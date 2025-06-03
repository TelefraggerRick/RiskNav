// This component (Toaster) and its associated Radix/ShadCN UI logic
// have been deprecated and replaced by the 'sonner' library for toast notifications.
// This change was made to address persistent "Maximum update depth exceeded" errors
// believed to be related to the previous toast implementation.

// The <Toaster /> component from 'sonner' should now be used in `src/app/layout.tsx`.

// See Sonner documentation for more usage examples: https://sonner.emilkowal.ski/

// The original code is left below for historical reference but is no longer active
// in the application.

/*
"use client"

import { useToast } from "@/hooks/use-toast" // Points to a now-deprecated hook
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast" // Points to now-deprecated components

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
*/
