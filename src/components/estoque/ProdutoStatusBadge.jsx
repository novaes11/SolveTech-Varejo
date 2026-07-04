import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function ProdutoStatusBadge({ quantidade, quantidade_minima }) {
  const qtd = Number(quantidade) || 0;
  const min = Number(quantidade_minima) || 0;
  if (qtd <= 0) {
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Zerado</Badge>;
  }
  if (qtd <= min) {
    return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Baixo</Badge>;
  }
  return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">OK</Badge>;
}