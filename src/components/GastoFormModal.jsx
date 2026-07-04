import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { notifyDataChanged } from '@/hooks/useAsync';
import { parseCurrencyInput } from '@/lib/format';

const categorias = ['Aluguel', 'Energia', 'Água', 'Mercadoria', 'Transporte', 'Salários', 'Impostos', 'Outros'];

export default function GastoFormModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setDescricao(''); setCategoria('Outros'); setValor(''); } }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = parseCurrencyInput(valor);
    if (!descricao.trim() || v <= 0) return;
    setLoading(true);
    try {
      await base44.entities.Gasto.create({
        descricao: descricao.trim(),
        categoria,
        valor: v,
        data: new Date().toISOString(),
      });
      toast({ title: 'Gasto registrado', description: 'O gasto foi salvo com sucesso.' });
      notifyDataChanged();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Não foi possível salvar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Registrar gasto</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gdesc">Descrição *</Label>
            <Input id="gdesc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Compra de mercadorias" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcat">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gval">Valor (R$) *</Label>
            <Input id="gval" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar gasto'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}