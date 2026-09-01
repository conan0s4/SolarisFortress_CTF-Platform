import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, saveToken, clearToken } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await api('/auth/me/')
      setUser(me)
      return me
    } catch (err) {
      if (err && err.status === 401) {
        setUser(null)
        return null
      }
      // Network errors shouldn't log the user out
      throw err
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await api('/auth/me/')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  async function login(username, password) {
    const data = await api('/auth/login/', {
      method: 'POST',
      body: { username, password },
    })
    if (data && data.token) saveToken(data.token)
    await refresh()
    return data
  }

  async function register(username, password, password_confirm) {
    const data = await api('/auth/register/', {
      method: 'POST',
      body: { username, password, password_confirm },
    })
    if (data && data.token) saveToken(data.token)
    await refresh()
    return data
  }

  async function logout() {
    try {
      await api('/auth/logout/', { method: 'POST' })
    } catch {}
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}