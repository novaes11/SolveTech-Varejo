import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { notifyDataChanged } from '@/hooks/useAsync';
import { parseCurrencyInput, formatCurrency } from '@/lib/format';

export default function MovimentacaoModal({ open, onOpenChange, cliente, tipo, saldoAtual }) {
  const { toast } = useToast();
  const isCompra = tipo === 'compra';
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);

  useEffect(() => { if (open) { setValor(''); setDescricao(''); setConfirmOverride(false); } }, [open]);

  const valorNum = parseCurrencyInput(valor);
  const overPayment = !isCompra && valorNum > saldoAtual;
  const overLimit = isCompra && (cliente?.limite_credito || 0) > 0 && (saldoAtual + valorNum) > cliente.limite_credito;
  const needsConfirm = overPayment || overLimit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (valorNum <= 0) return;
    if (needsConfirm && !confirmOverride) { setConfirmOverride(true); return; }
    setLoading(true);
    try {
      await base44.entities.MovimentacaoFiado.create({
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        tipo,
        valor: valorNum,
        descricao: descricao.trim() || (isCompra ? 'Compra fiada' : 'Pagamento'),
        data: new Date().toISOString(),
      });
      toast({
        title: isCompra ? 'Compra registrada' : 'Pagamento registrado',
        description: isCompra ? 'Saldo devedor atualizado.' : 'Saldo devedor reduzido.',
      });
      notifyDataChanged();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Não foi possível salvar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const warningText = overPayment
    ? `O pagamento (${formatCurrency(valorNum)}) é maior que o saldo devedor (${formatCurrency(saldoAtual)}). Confirmar mesmo assim?`
    : overLimit
      ? `Esta compra ultrapassa o limite de crédito de ${formatCurrency(cliente.limite_credito)}. Confirmar mesmo assim?`
      : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCompra ? 'Registrar compra fiada' : 'Registrar pagamento'}</DialogTitle>
          <DialogDescription>{cliente?.nome} · Saldo devedor: {formatCurrency(saldoAtual)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mvalor">Valor (R$) *</Label>
            <Input id="mvalor" inputMode="decimal" value={valor} onChange={(e) => { setValor(e.target.value); setConfirmOverride(false); }} placeholder="0,00" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mdesc">Descrição</Label>
            <Input id="mdesc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={isCompra ? 'Ex: 3 pães, 2 leites' : 'Ex: Pagamento parcial'} />
          </div>
          {warningText && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-amber-500/10 text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{warningText}</span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || valorNum <= 0} variant={isCompra ? 'destructive' : 'default'}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : (confirmOverride ? 'Confirmar mesmo assim' : (isCompra ? 'Registrar compra' : 'Registrar pagamento'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}