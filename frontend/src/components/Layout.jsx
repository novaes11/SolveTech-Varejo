import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const titulos = {
  '/': 'Dashboard',
  '/estoque': 'Estoque',
  '/vendas': 'Vendas',
  '/caderneta': 'Caderneta',
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const titulo = titulos[pathname] || 'SolveTech'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Área principal — com margem esquerda pra não ficar atrás da sidebar */}
      <main className="ml-64">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-20 flex items-center px-8">
          <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
        </header>

        {/* Conteúdo da página */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
