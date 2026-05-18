import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, firebaseEnabled } from '../lib/firebase'
import { useStore } from '../store'

interface AuthContextValue {
  user: User | null
  loading: boolean
  syncing: boolean
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
  firebaseEnabled: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  syncing: false,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  firebaseEnabled: false,
})

async function syncWithFirestore(uid: string) {
  if (!db) return
  const ref = doc(db, 'users', uid, 'wealthwise', 'state')
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const data = snap.data()
    if (data?.state) {
      // Load cloud state into store (functions stay intact via Zustand merge)
      useStore.setState(data.state)
    }
  } else {
    // First login: push local state to cloud
    const state = useStore.getState()
    const serializable = Object.fromEntries(
      Object.entries(state).filter(([, v]) => typeof v !== 'function'),
    )
    await setDoc(ref, { state: serializable, updatedAt: Date.now() })
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseEnabled)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!firebaseEnabled || !auth) return
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        setSyncing(true)
        try { await syncWithFirestore(u.uid) } catch (e) { console.warn('Cloud sync error', e) }
        setSyncing(false)
      }
      setLoading(false)
    })
  }, [])

  async function signInWithGoogle() {
    if (!auth || !googleProvider) return
    await signInWithPopup(auth, googleProvider)
  }

  async function signOutUser() {
    if (!auth) return
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, syncing, signInWithGoogle, signOutUser, firebaseEnabled }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
