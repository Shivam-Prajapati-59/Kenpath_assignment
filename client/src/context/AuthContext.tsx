import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '@/lib/api'

export interface User {
  id: number
  name: string
  email: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const USER_KEY = 'sweety_user'
const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): User | null {
  try {
    return tokenStore.get() ? JSON.parse(localStorage.getItem(USER_KEY) || 'null') : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)

  const handleAuth = ({ token, user }: { token: string; user: User }) => {
    tokenStore.set(token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setUser(user)
  }

  const logout = useCallback(() => {
    tokenStore.clear()
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('sweety:logout', logout)
    return () => window.removeEventListener('sweety:logout', logout)
  }, [logout])

  const value: AuthContextValue = {
    user,
    logout,
    login: async (email, password) =>
      handleAuth(await api('/auth/login', { method: 'POST', body: { email, password } })),
    register: async (name, email, password) =>
      handleAuth(await api('/auth/register', { method: 'POST', body: { name, email, password } })),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
