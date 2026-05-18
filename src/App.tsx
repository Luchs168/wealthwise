import { lazy, Suspense, type ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Screen1 from './pages/Screen1'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import AnalysisLoading from './components/AnalysisLoading'
import { AuthProvider } from './context/AuthContext'
import FirestoreSync from './components/FirestoreSync'

const Screen2 = lazy(() => import('./pages/Screen2'))
const Screen3 = lazy(() => import('./pages/Screen3'))
const Screen4 = lazy(() => import('./pages/Screen4'))

const wrap = (el: ReactElement, msg?: string) => (
  <Suspense fallback={<AnalysisLoading message={msg} />}>{el}</Suspense>
)

export default function App() {
  return (
    <AuthProvider>
      <FirestoreSync />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/schritt/1" element={<Screen1 />} />
          <Route path="/schritt/2" element={wrap(<Screen2 />)} />
          <Route path="/schritt/3" element={wrap(<Screen3 />)} />
          <Route path="/schritt/4" element={wrap(<Screen4 />, 'Ihre Analyse wird vorbereitet…')} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
