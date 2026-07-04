import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BookOpen,
  Store,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/caderneta', label: 'Caderneta', icon: BookOpen },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">SolveTech</h1>
          <p className="text-[11px] text-gray-400 leading-tight">Varejo Inteligente</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé da sidebar */}
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 text-center">MVP v0.1.0</p>
      </div>
    </aside>
  )
}
