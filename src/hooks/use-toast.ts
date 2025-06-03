
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 0 // Changed from 1000 to 0

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
        let evictedToastId: string | null = null;
        // If the store is already at its limit, the oldest toast will be evicted.
        // With TOAST_LIMIT = 1, this means any existing toast is evicted.
        if (state.toasts.length >= TOAST_LIMIT) {
          evictedToastId = state.toasts[state.toasts.length - TOAST_LIMIT]?.id;
        }
  
        if (evictedToastId && toastTimeouts.has(evictedToastId)) {
          clearTimeout(toastTimeouts.get(evictedToastId)!);
          toastTimeouts.delete(evictedToastId);
        }
        
        return {
          ...state,
          toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
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
      const { toastId } = action

      if (toastId) {
         // Check if the toast to dismiss still exists and is marked as open
        const toastExistsAndIsOpen = state.toasts.find(
          (t) => t.id === toastId && t.open
        );
        if (toastExistsAndIsOpen) {
          addToRemoveQueue(toastId);
          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === toastId ? { ...t, open: false } : t
            ),
          };
        }
        // If toast doesn't exist or isn't open, no state change needed for open status
        // but ensure remove queue is handled if it was previously scheduled
        if (!toastExistsAndIsOpen && !toastTimeouts.has(toastId) && state.toasts.find(t=>t.id === toastId)) {
            // It exists but is already marked as closed, ensure it's queued for removal if not already
            addToRemoveQueue(toastId);
        }
        return state; // No change if toast not found or already closed by our state

      } else {
        // Dismiss all toasts
        state.toasts.forEach((toast) => {
          if (toast.open) { // Only add to queue if it was open
            addToRemoveQueue(toast.id);
          }
        });
        return {
          ...state,
          toasts: state.toasts.map((t) => ({ ...t, open: false })),
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
  
  // This is the dismiss function that will be called either by external code or by onOpenChange
  const dismissToast = () => {
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  };

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (isOpenByPrimitive) => {
        // If the Radix primitive is signalling it's closing
        if (!isOpenByPrimitive) {
          const currentToastInGlobalState = memoryState.toasts.find(t => t.id === id);
          // If our state still thinks it's open, and the primitive says it's closing,
          // then this is a legitimate "close" event to process.
          if (currentToastInGlobalState && currentToastInGlobalState.open) {
            dismissToast(); 
          }
        }
      },
    },
  })

  return {
    id: id,
    dismiss: dismissToast,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
