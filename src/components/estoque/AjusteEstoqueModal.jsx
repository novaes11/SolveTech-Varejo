import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { notifyDataChanged } from '@/hooks/useAsync';

export default function AjusteEstoqueModal({ open, onOpenChange, produto }) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState('entrada');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = (v) => {
    if (!v) { setTipo('entrada'); setQuantidade(''); setMotivo(''); }
    onOpenChange(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!produto) return;
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) return;
    if (tipo === 'saida' && qtd > produto.quantidade) {
      toast({ title: 'Quantidade insuficiente', description: `Há apenas ${produto.quantidade} de ${produto.nome} em estoque.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const novaQtd = tipo === 'entrada' ? produto.quantidade + qtd : produto.quantidade - qtd;
      await base44.entities.Produto.update(produto.id, { quantidade: novaQtd });
      await base44.entities.MovimentacaoEstoque.create({
        produto_id: produto.id,
        produto_nome: produto.nome,
        tipo,
        quantidade: qtd,
        motivo: motivo.trim() || (tipo === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'),
        data: new Date().toISOString(),
      });
      toast({ title: 'Estoque atualizado', description: `${tipo === 'entrada' ? '+' : '-'}${qtd} ${produto.nome}.` });
      notifyDataChanged();
      handleClose(false);
    } catch (err) {
      toast({ title: 'Não foi possível atualizar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar estoque</DialogTitle>
          <DialogDescription>{produto?.nome} · {produto?.quantidade} em estoque</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setTipo('entrada')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${tipo === 'entrada' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
              <ArrowDownCircle className="w-5 h-5" /> Entrada
            </button>
            <button type="button" onClick={() => setTipo('saida')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${tipo === 'saida' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
              <ArrowUpCircle className="w-5 h-5" /> Saída
            </button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qtd">Quantidade *</Label>
            <Input id="qtd" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Compra de mercadoria, perda, ajuste" />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Confirmar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}