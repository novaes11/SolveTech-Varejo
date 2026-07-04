import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, BookUser, MessageCircle, BarChart3 } from 'lucide-react';

const items = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/assistente', label: 'Assistente', icon: MessageCircle },
  { to: '/caderneta', label: 'Clientes', icon: BookUser },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border safe-pb">
      <div className="grid grid-cols-5">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}