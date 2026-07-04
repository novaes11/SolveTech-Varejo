import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ScanLine } from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { notifyDataChanged } from '@/hooks/useAsync';
import { parseCurrencyInput } from '@/lib/format';

const textareaCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function ProdutoFormModal({ open, onOpenChange, produto, defaultCodigoBarras }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    nome: '', categoria: '', descricao: '', preco_custo: '', preco_venda: '', quantidade: '', quantidade_minima: '', codigo_barras: '',
  });
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        nome: produto?.nome || '',
        categoria: produto?.categoria || '',
        descricao: produto?.descricao || '',
        preco_custo: produto?.preco_custo != null ? String(produto.preco_custo).replace('.', ',') : '',
        preco_venda: produto?.preco_venda != null ? String(produto.preco_venda).replace('.', ',') : '',
        quantidade: produto?.quantidade != null ? String(produto.quantidade) : '',
        quantidade_minima: produto?.quantidade_minima != null ? String(produto.quantidade_minima) : '',
        codigo_barras: produto?.codigo_barras || defaultCodigoBarras || '',
      });
    }
  }, [open, produto, defaultCodigoBarras]);

  const set = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria.trim(),
      descricao: form.descricao.trim(),
      codigo_barras: form.codigo_barras.trim(),
      preco_custo: parseCurrencyInput(form.preco_custo),
      preco_venda: parseCurrencyInput(form.preco_venda),
      quantidade: Number(form.quantidade) || 0,
      quantidade_minima: Number(form.quantidade_minima) || 0,
    };
    try {
      if (produto?.id) {
        await base44.entities.Produto.update(produto.id, payload);
        toast({ title: 'Produto atualizado', description: 'As alterações foram salvas.' });
      } else {
        await base44.entities.Produto.create(payload);
        toast({ title: 'Produto cadastrado', description: 'Seu produto foi adicionado ao estoque.' });
      }
      notifyDataChanged();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Não foi possível salvar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{produto?.id ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do produto *</Label>
              <Input id="nome" value={form.nome} onChange={set('nome')} placeholder="Ex: Refrigerante 2L" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_barras">Código de barras</Label>
              <div className="flex gap-2">
                <Input id="codigo_barras" value={form.codigo_barras} onChange={set('codigo_barras')} placeholder="Ex: 7891234567890" className="flex-1" />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setScannerOpen(true)} title="Escanear código">
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="preco_venda">Preço de venda (R$) *</Label>
                <Input id="preco_venda" inputMode="decimal" value={form.preco_venda} onChange={set('preco_venda')} placeholder="0,00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco_custo">Preço de custo (R$)</Label>
                <Input id="preco_custo" inputMode="decimal" value={form.preco_custo} onChange={set('preco_custo')} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade atual</Label>
                <Input id="quantidade" inputMode="numeric" value={form.quantidade} onChange={set('quantidade')} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_minima">Qtd. mínima (alerta)</Label>
                <Input id="quantidade_minima" inputMode="numeric" value={form.quantidade_minima} onChange={set('quantidade_minima')} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" value={form.categoria} onChange={set('categoria')} placeholder="Ex: Bebidas" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea id="descricao" value={form.descricao} onChange={set('descricao')} rows={2} placeholder="Observações sobre o produto" className={textareaCls} />
            </div>
            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : (produto?.id ? 'Salvar alterações' : 'Cadastrar produto')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <BarcodeScannerModal open={scannerOpen} onOpenChange={setScannerOpen} onCodeScanned={(code) => setForm(s => ({ ...s, codigo_barras: code }))} />
    </>
  );
}