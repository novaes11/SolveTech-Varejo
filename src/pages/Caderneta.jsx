import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAsync, notifyDataChanged } from '@/hooks/useAsync';
import { formatCurrency, formatDateTime, initials, formatPhone } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import ClienteFormModal from '@/components/caderneta/ClienteFormModal';
import MovimentacaoModal from '@/components/caderneta/MovimentacaoModal';
import { useToast } from '@/components/ui/use-toast';
import { BookUser, Plus, Search, ArrowDownCircle, ArrowUpCircle, Phone, Trash2, MessageCircle, ChevronLeft, Pencil, Wallet } from 'lucide-react';

export default function Caderneta() {
  const { data, loading } = useAsync(() => Promise.all([
    base44.entities.Cliente.list('nome', 1000),
    base44.entities.MovimentacaoFiado.list('-data', 2000),
  ]), []);
  const [clientes, movs] = data || [null, null];
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCli, setEditingCli] = useState(null);
  const [movState, setMovState] = useState(null);
  const [excluirCli, setExcluirCli] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const saldos = useMemo(() => {
    const map = {};
    (movs || []).forEach(m => { map[m.cliente_id] = (map[m.cliente_id] || 0) + (m.tipo === 'compra' ? (m.valor || 0) : -(m.valor || 0)); });
    return map;
  }, [movs]);

  const filtrados = (clientes || []).filter(c => c.status !== 'arquivado' && c.nome.toLowerCase().includes(busca.toLowerCase()));
  const selected = (clientes || []).find(c => c.id === selectedId);
  const movsCliente = (movs || []).filter(m => m.cliente_id === selectedId).sort((a, b) => new Date(b.data) - new Date(a.data));
  const saldoCliente = saldos[selectedId] || 0;

  const handleExcluir = async () => {
    setDeleting(true);
    try {
      const temHistorico = (movs || []).some(m => m.cliente_id === excluirCli.id);
      if (temHistorico) {
        await base44.entities.Cliente.update(excluirCli.id, { status: 'arquivado' });
        toast({ title: 'Cliente arquivado', description: 'Como há histórico financeiro, o cliente foi arquivado em vez de excluído.' });
      } else {
        await base44.entities.Cliente.delete(excluirCli.id);
        toast({ title: 'Cliente excluído', description: `${excluirCli.nome} foi removido da caderneta.` });
      }
      if (selectedId === excluirCli.id) setSelectedId(null);
      notifyDataChanged();
      setExcluirCli(null);
    } catch (err) {
      toast({ title: 'Não foi possível excluir', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleLembrete = async (cli) => {
    try {
      await base44.entities.EventoAssistente.create({
        remetente: 'sistema',
        mensagem_original: `Lembrete de pagamento enviado para ${cli.nome}.`,
        intencao: 'lembrete_pagamento',
        acao_realizada: 'Lembrete registrado',
        detalhes: `Cliente: ${cli.nome} · Saldo: ${formatCurrency(saldos[cli.id] || 0)}`,
        status: 'executado',
        data: new Date().toISOString(),
      });
      notifyDataChanged();
      toast({ title: 'Lembrete registrado', description: `Tentativa de lembrete para ${cli.nome} foi registrada.` });
    } catch (err) {
      toast({ title: 'Não foi possível registrar o lembrete', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => e.preventDefault()} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="pl-9 h-10 bg-card" />
        </form>
        <Button onClick={() => { setEditingCli(null); setFormOpen(true); }} className="h-10 gap-2"><Plus className="w-4 h-4" /> Novo cliente</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <Card className={`p-2 shadow-sm ${selected ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <div className="p-3 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={BookUser}
              title={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente na caderneta ainda'}
              description={busca ? 'Tente outro nome.' : 'Cadastre seu primeiro cliente para controlar o fiado.'}
              actionLabel={busca ? undefined : 'Cadastrar primeiro cliente'}
              onAction={busca ? undefined : () => { setEditingCli(null); setFormOpen(true); }}
            />
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto no-scrollbar">
              {filtrados.map(c => {
                const saldo = saldos[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedId === c.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold shrink-0">{initials(c.nome)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.nome}</p>
                        {c.telefone && <p className="text-xs text-muted-foreground truncate">{c.telefone}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${saldo > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{formatCurrency(saldo)}</p>
                        <p className="text-[10px] text-muted-foreground">devido</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className={selected ? '' : 'hidden lg:block'}>
          {!selected ? (
            <Card className="shadow-sm h-full flex items-center justify-center min-h-[300px]">
              <EmptyState icon={BookUser} title="Selecione um cliente" description="Escolha um cliente na lista para ver o histórico e registrar movimentações." />
            </Card>
          ) : (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" className="lg:hidden gap-1 -ml-2" onClick={() => setSelectedId(null)}><ChevronLeft className="w-4 h-4" /> Voltar</Button>

              <Card className="p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-lg font-bold shrink-0">{initials(selected.nome)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-heading font-bold text-lg truncate">{selected.nome}</h2>
                        {selected.telefone && (
                          <a href={`https://wa.me/55${(selected.telefone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                            <Phone className="w-3.5 h-3.5" /> {selected.telefone}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCli(selected); setFormOpen(true); }} title="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setExcluirCli(selected)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                        <p className="text-xs text-muted-foreground">Saldo devedor</p>
                        <p className={`text-xl font-bold ${saldoCliente > 0 ? 'text-red-600' : 'text-foreground'}`}>{formatCurrency(saldoCliente)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Limite de crédito</p>
                        <p className="text-xl font-bold">{formatCurrency(selected.limite_credito || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                  <Button variant="destructive" className="gap-2" onClick={() => setMovState({ tipo: 'compra' })}><ArrowDownCircle className="w-4 h-4" /> Registrar compra</Button>
                  <Button className="gap-2" onClick={() => setMovState({ tipo: 'pagamento' })}><ArrowUpCircle className="w-4 h-4" /> Registrar pagamento</Button>
                  <Button variant="outline" className="gap-2 col-span-2 sm:col-span-1" onClick={() => handleLembrete(selected)}><MessageCircle className="w-4 h-4" /> Lembrete WhatsApp</Button>
                </div>
              </Card>

              <Card className="shadow-sm">
                <div className="p-4 border-b border-border">
                  <h3 className="font-heading font-semibold">Histórico de movimentações</h3>
                </div>
                {movsCliente.length === 0 ? (
                  <EmptyState icon={Wallet} title="Sem movimentações" description="As compras e pagamentos deste cliente aparecerão aqui." />
                ) : (
                  <div className="divide-y divide-border">
                    {movsCliente.map(m => {
                      const isCompra = m.tipo === 'compra';
                      return (
                        <div key={m.id} className="flex items-center gap-3 p-4">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCompra ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
                            {isCompra ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{m.descricao || (isCompra ? 'Compra fiada' : 'Pagamento')}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(m.data)}</p>
                          </div>
                          <p className={`font-bold ${isCompra ? 'text-red-600' : 'text-primary'}`}>{isCompra ? '+' : '-'}{formatCurrency(m.valor)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      <ClienteFormModal open={formOpen} onOpenChange={setFormOpen} cliente={editingCli} />
      <MovimentacaoModal
        open={!!movState}
        onOpenChange={(v) => !v && setMovState(null)}
        cliente={selected}
        tipo={movState?.tipo}
        saldoAtual={saldoCliente}
      />
      <ConfirmDialog
        open={!!excluirCli}
        onOpenChange={(v) => !v && setExcluirCli(null)}
        title="Excluir cliente"
        description={`Deseja remover "${excluirCli?.nome}" da caderneta?`}
        confirmLabel="Excluir"
        onConfirm={handleExcluir}
        loading={deleting}
      />
    </div>
  );
}