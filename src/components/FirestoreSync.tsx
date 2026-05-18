import { useEffect, useRef } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { useStore } from '../store'

// Invisible component — subscribes to store changes and debounce-saves to Firestore
export default function FirestoreSync() {
  const { user } = useAuth()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user || !db) return

    const unsub = useStore.subscribe((state) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        try {
          const serializable = Object.fromEntries(
            Object.entries(state).filter(([, v]) => typeof v !== 'function'),
          )
          await setDoc(doc(db!, 'users', user.uid, 'wealthwise', 'state'), {
            state: serializable,
            updatedAt: Date.now(),
          })
        } catch (e) {
          console.warn('Firestore save failed', e)
        }
      }, 2000)
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user])

  return null
}
