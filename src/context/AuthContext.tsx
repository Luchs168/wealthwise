import { createContext, useContext, type ReactNode } from 'react'

interface AuthContextValue {
  user: null
  loading: false
  syncing: false
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  syncing: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, loading: false, syncing: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
