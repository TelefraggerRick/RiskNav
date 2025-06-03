// This hook (useToast) and its associated Radix/ShadCN UI components (Toast, Toaster)
// have been deprecated and replaced by the 'sonner' library for toast notifications.
// This change was made to address persistent "Maximum update depth exceeded" errors
// believed to be related to the previous toast implementation.

// For new toast notifications, please import and use `toast` from 'sonner'.
// Example:
// import { toast } from 'sonner';
// toast('My notification message');
// toast.success('Success!');
// toast.error('An error occurred.');

// See Sonner documentation for more usage examples: https://sonner.emilkowal.ski/

// The original code is left below for historical reference but is no longer active
// in the application.

/*
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast" // Points to a now-deprecated component

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 0

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId)!)
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      {
        const newToasts = [action.toast, ...state.toasts];
        const toastsToKeep = newToasts.slice(0, TOAST_LIMIT);
        const evictedToasts = newToasts.slice(TOAST_LIMIT);

        evictedToasts.forEach(toast => {
          if (toastTimeouts.has(toast.id)) {
            clearTimeout(toastTimeouts.get(toast.id)!);
            toastTimeouts.delete(toast.id);
          }
        });
        
        return {
          ...state,
          toasts: toastsToKeep,
        };
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        const toastToDismiss = state.toasts.find(t => t.id === toastId);
        if (toastToDismiss && toastToDismiss.open !== false) {
          addToRemoveQueue(toastId);
          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === toastId ? { ...t, open: false } : t
            ),
          };
        }
        return state; // Toast not found or already marked as closed
      } else {
        // Dismiss all toasts
        return {
          ...state,
          toasts: state.toasts.map((t) => {
            if (t.open !== false) { // Only queue if not already marked closed
              addToRemoveQueue(t.id);
            }
            return { ...t, open: false };
          }),
        };
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  
  const dismiss = () => {
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (isOpenByPrimitive) => {
        if (!isOpenByPrimitive) {
          const currentToast = memoryState.toasts.find(t => t.id === id);
          if (currentToast && currentToast.open) { // Check our state, not just primitive
            dismiss();
          }
        }
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, []) // Empty dependency array: subscribe/unsubscribe only on mount/unmount

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
*/
