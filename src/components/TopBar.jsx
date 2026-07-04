import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const titles = {
  '/': 'Dashboard',
  '/estoque': 'Gestão de Estoque',
  '/caderneta': 'Caderneta de Clientes',
  '/assistente': 'Assistente WhatsApp',
  '/relatorios': 'Relatórios',
};

export default function TopBar({ onNovaVenda }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const title = titles[location.pathname] || 'SolveTech Varejo';

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/estoque?busca=${encodeURIComponent(query)}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-6 h-16">
        <h1 className="font-heading font-bold text-lg md:text-xl shrink-0">{title}</h1>
        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md ml-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9 h-10 bg-card"
            />
          </div>
        </form>
        <Button onClick={onNovaVenda} className="ml-auto sm:ml-2 h-10 gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Venda</span>
          <span className="sm:hidden">Venda</span>
        </Button>
      </div>
    </header>
  );
}