import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { notifyDataChanged } from '@/hooks/useAsync';
import { parseCurrencyInput, formatPhone } from '@/lib/format';

const textareaCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function ClienteFormModal({ open, onOpenChange, cliente }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ nome: '', telefone: '', limite_credito: '', observacoes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        nome: cliente?.nome || '',
        telefone: cliente?.telefone || '',
        limite_credito: cliente?.limite_credito != null ? String(cliente.limite_credito).replace('.', ',') : '',
        observacoes: cliente?.observacoes || '',
      });
    }
  }, [open, cliente]);

  const set = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setLoading(true);
    const payload = {
      nome: form.nome.trim(),
      telefone: formatPhone(form.telefone),
      limite_credito: parseCurrencyInput(form.limite_credito),
      observacoes: form.observacoes.trim(),
      status: cliente?.status || 'ativo',
    };
    try {
      if (cliente?.id) {
        await base44.entities.Cliente.update(cliente.id, payload);
        toast({ title: 'Cliente atualizado', description: 'As alterações foram salvas.' });
      } else {
        await base44.entities.Cliente.create(payload);
        toast({ title: 'Cliente cadastrado', description: 'Novo cliente adicionado à caderneta.' });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cliente?.id ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cnome">Nome *</Label>
            <Input id="cnome" value={form.nome} onChange={set('nome')} placeholder="Nome do cliente" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tel">Telefone (WhatsApp)</Label>
            <Input id="tel" value={form.telefone} onChange={(e) => setForm(s => ({ ...s, telefone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" inputMode="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="limite">Limite de crédito (R$)</Label>
            <Input id="limite" inputMode="decimal" value={form.limite_credito} onChange={set('limite_credito')} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <textarea id="obs" value={form.observacoes} onChange={set('observacoes')} rows={2} placeholder="Anotações sobre o cliente" className={textareaCls} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : (cliente?.id ? 'Salvar alterações' : 'Cadastrar cliente')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}