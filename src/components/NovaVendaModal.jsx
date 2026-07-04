import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, ShoppingCart, ScanLine } from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useAsync, notifyDataChanged } from '@/hooks/useAsync';
import { formatCurrency } from '@/lib/format';
import EmptyState from '@/components/EmptyState';

export default function NovaVendaModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const { data: produtos } = useAsync(() => base44.entities.Produto.list('nome', 500), [open], { listen: false });
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => { if (!open) { setProdutoId(''); setQuantidade('1'); } }, [open]);

  const handleBarcodeScan = (code) => {
    const found = (produtos || []).find(p => p.codigo_barras === code);
    if (found) {
      setProdutoId(found.id);
      toast({ title: 'Produto encontrado', description: found.nome });
    } else {
      toast({ title: 'Produto não encontrado', description: 'Nenhum produto com este código de barras.', variant: 'destructive' });
    }
  };

  const produto = (produtos || []).find(p => p.id === produtoId);
  const qtd = Number(quantidade) || 0;
  const total = produto ? produto.preco_venda * qtd : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!produto || qtd <= 0) return;
    if (qtd > produto.quantidade) {
      toast({ title: 'Estoque insuficiente', description: `Há apenas ${produto.quantidade} de ${produto.nome}.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const valorTotal = produto.preco_venda * qtd;
      const lucro = (produto.preco_venda - (produto.preco_custo || 0)) * qtd;
      await base44.entities.Venda.create({
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: qtd,
        preco_unitario: produto.preco_venda,
        custo_unitario: produto.preco_custo || 0,
        total: valorTotal,
        lucro,
        data: new Date().toISOString(),
      });
      await base44.entities.Produto.update(produto.id, { quantidade: produto.quantidade - qtd });
      await base44.entities.MovimentacaoEstoque.create({
        produto_id: produto.id,
        produto_nome: produto.nome,
        tipo: 'saida',
        quantidade: qtd,
        motivo: 'Venda',
        data: new Date().toISOString(),
      });
      toast({ title: 'Venda registrada', description: `${qtd}x ${produto.nome} — ${formatCurrency(valorTotal)}.` });
      notifyDataChanged();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Não foi possível registrar a venda', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Nova venda</DialogTitle>
            <DialogDescription>Registre a venda e atualize o estoque automaticamente.</DialogDescription>
          </DialogHeader>
          {produtos && produtos.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Nenhum produto cadastrado" description="Cadastre um produto antes de registrar vendas." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Produto *</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary" onClick={() => setScannerOpen(true)}>
                    <ScanLine className="w-3.5 h-3.5" /> Escanear
                  </Button>
                </div>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent>
                    {(produtos || []).map(p => (
                      <SelectItem key={p.id} value={p.id} disabled={p.quantidade <= 0}>
                        {p.nome} — {formatCurrency(p.preco_venda)} ({p.quantidade} em estoque)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qtd">Quantidade *</Label>
                  <Input id="qtd" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Total</Label>
                  <div className="h-10 flex items-center px-3 rounded-md bg-muted font-semibold text-primary">{formatCurrency(total)}</div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading || !produto}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registrando...</> : 'Registrar venda'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <BarcodeScannerModal open={scannerOpen} onOpenChange={setScannerOpen} onCodeScanned={handleBarcodeScan} />
    </>
  );
}