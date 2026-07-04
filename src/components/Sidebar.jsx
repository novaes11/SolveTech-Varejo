import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/hooks/useAsync';
import { LayoutDashboard, Package, BookUser, MessageCircle, BarChart3, LogOut, Store } from 'lucide-react';
import { initials } from '@/lib/format';

const nav = [
  { to: '/assistente', label: 'Assistente', icon: MessageCircle },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/caderneta', label: 'Clientes', icon: BookUser },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { data: user } = useAsync(() => base44.auth.me().catch(() => null), [], { listen: false });

  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <Store className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="font-heading font-bold text-sm">SolveTech</p>
          <p className="text-[11px] text-muted-foreground -mt-0.5">Varejo</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials(user?.full_name || user?.email || 'L J')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || 'Sua loja'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}