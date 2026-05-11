import { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext(null)

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((kind, msg, opts = {}) => {
    const id = nextId++
    const ttl = opts.ttl ?? (kind === 'error' ? 4500 : 2800)
    setToasts((list) => [...list, { id, kind, msg }])
    setTimeout(() => dismiss(id), ttl)
    return id
  }, [dismiss])

  const api = {
    success: (msg, opts) => push('success', msg, opts),
    error: (msg, opts) => push('error', msg, opts),
    info: (msg, opts) => push('info', msg, opts),
    dismiss,
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.kind} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">
              {t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'ℹ'}
            </span>
            <span className="toast-msg">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}
