import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Screen1 from './pages/Screen1'
import Screen2 from './pages/Screen2'
import Screen3 from './pages/Screen3'
import Screen4 from './pages/Screen4'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/schritt/1" element={<Screen1 />} />
        <Route path="/schritt/2" element={<Screen2 />} />
        <Route path="/schritt/3" element={<Screen3 />} />
        <Route path="/schritt/4" element={<Screen4 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
