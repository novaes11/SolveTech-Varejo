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

const toBR = (n, casas = 2) => (Number.isFinite(n) ? n.toFixed(casas).replace('.', ',') : '');

export default function ProdutoFormModal({ open, onOpenChange, produto, defaultCodigoBarras }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    nome: '', categoria: '', descricao: '', preco_custo: '', preco_venda: '', margem: '', quantidade: '', quantidade_minima: '', codigo_barras: '',
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
        margem: produto?.preco_custo > 0 && produto?.preco_venda != null
          ? toBR(((produto.preco_venda - produto.preco_custo) / produto.preco_custo) * 100, 1)
          : '',
        quantidade: produto?.quantidade != null ? String(produto.quantidade) : '',
        quantidade_minima: produto?.quantidade_minima != null ? String(produto.quantidade_minima) : '',
        codigo_barras: produto?.codigo_barras || defaultCodigoBarras || '',
      });
    }
  }, [open, produto, defaultCodigoBarras]);

  const set = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  // Custo, margem (%) e preço de venda mantidos em sincronia:
  // editar custo ou margem recalcula a venda; editar a venda recalcula a margem.
  const setCusto = (e) => {
    const preco_custo = e.target.value;
    setForm(s => {
      const custo = parseCurrencyInput(preco_custo);
      const margem = parseCurrencyInput(s.margem);
      if (custo > 0 && s.margem !== '') {
        return { ...s, preco_custo, preco_venda: toBR(custo * (1 + margem / 100)) };
      }
      const venda = parseCurrencyInput(s.preco_venda);
      if (custo > 0 && venda > 0) {
        return { ...s, preco_custo, margem: toBR(((venda - custo) / custo) * 100, 1) };
      }
      return { ...s, preco_custo };
    });
  };

  const setMargem = (e) => {
    const margem = e.target.value;
    setForm(s => {
      const custo = parseCurrencyInput(s.preco_custo);
      if (custo > 0 && margem !== '') {
        return { ...s, margem, preco_venda: toBR(custo * (1 + parseCurrencyInput(margem) / 100)) };
      }
      return { ...s, margem };
    });
  };

  const setVenda = (e) => {
    const preco_venda = e.target.value;
    setForm(s => {
      const custo = parseCurrencyInput(s.preco_custo);
      const venda = parseCurrencyInput(preco_venda);
      if (custo > 0 && venda > 0) {
        return { ...s, preco_venda, margem: toBR(((venda - custo) / custo) * 100, 1) };
      }
      return { ...s, preco_venda, margem: venda > 0 ? s.margem : '' };
    });
  };

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
                <Label htmlFor="preco_custo">Preço de custo (R$)</Label>
                <Input id="preco_custo" inputMode="decimal" value={form.preco_custo} onChange={setCusto} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margem">Margem sobre o custo (%)</Label>
                <Input id="margem" inputMode="decimal" value={form.margem} onChange={setMargem} placeholder="Ex: 50" disabled={parseCurrencyInput(form.preco_custo) <= 0} title={parseCurrencyInput(form.preco_custo) <= 0 ? 'Informe o preço de custo para usar a margem' : ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco_venda">Preço de venda (R$) *</Label>
              <Input id="preco_venda" inputMode="decimal" value={form.preco_venda} onChange={setVenda} placeholder="0,00" required />
              {parseCurrencyInput(form.preco_custo) > 0 && parseCurrencyInput(form.preco_venda) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Lucro por unidade: {toBR(parseCurrencyInput(form.preco_venda) - parseCurrencyInput(form.preco_custo))} R$
                  {form.margem !== '' && ` (margem de ${form.margem}%)`}
                </p>
              )}
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