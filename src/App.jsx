import { Route, Routes } from 'react-router-dom'
import LibraryProvider from './components/LibraryProvider'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Show from './pages/Show'
import Watch from './pages/Watch'

export default function App() {
  return (
    <LibraryProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/show/:showId" element={<Show />} />
        <Route path="/watch/:showId/:fileId" element={<Watch />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </LibraryProvider>
  )
}
