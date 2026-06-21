import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Caderneta from './pages/Caderneta'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/caderneta" element={<Caderneta />} />
      </Routes>
    </Layout>
  )
}
