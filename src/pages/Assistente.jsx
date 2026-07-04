import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAsync, notifyDataChanged } from '@/hooks/useAsync';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/format';
import { Send, Bot, Sparkles, CheckCircle2, Brain, Database, AlertTriangle, ShieldCheck } from 'lucide-react';

const exemplos = [
  'Cadastre produto Refrigerante 2L por 8 reais',
  'Registre venda de 2 Refrigerante 2L',
  'Cadastre cliente João telefone 11999999999',
  'João deve 15 reais de compra fiada',
];

export default function Assistente() {
  const { data, loading } = useAsync(() => Promise.all([
    base44.entities.EventoAssistente.list('-data', 100),
    base44.entities.Produto.list('nome', 500),
    base44.entities.Cliente.list('nome', 500),
  ]), []);
  const [eventos, produtos, clientes] = data || [null, null, null];

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const ordered = (eventos || []).slice().reverse();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [eventos, sending]);

  const interpretar = async (texto) => {
    const prompt = `Você é o assistente do SolveTech Varejo, um sistema para pequenos comerciantes brasileiros. Interprete a mensagem do lojista e retorne uma ação em JSON.

Produtos cadastrados: ${(produtos || []).map(p => p.nome).join(', ') || 'nenhum'}
Clientes cadastrados: ${(clientes || []).map(c => c.nome).join(', ') || 'nenhum'}

Intenções possíveis:
- criar_produto: cadastrar um novo produto. parameters: {nome, preco_venda}
- registrar_venda: registrar uma venda (diminui estoque). parameters: {produto_nome, quantidade}
- criar_cliente: cadastrar cliente. parameters: {nome, telefone}
- registrar_fiado: registrar compra fiada (aumenta saldo devedor). parameters: {cliente_nome, valor, descricao}
- consultar_saldo: consultar saldo devedor de um cliente. parameters: {cliente_nome}
- desconhecido: não foi possível entender

Retorne JSON: {"intent": "...", "parameters": {...}, "resposta": "mensagem curta e amigável em português brasileiro confirmando a ação"}. Se faltar informação, use intent "desconhecido" e peça esclarecimento na resposta.`;
    return await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}\n\nMensagem do lojista: "${texto}"`,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string' },
          parameters: { type: 'object', additionalProperties: true },
          resposta: { type: 'string' },
        },
        required: ['intent', 'resposta'],
      },
    });
  };

  const executarAcao = async (intent, parameters = {}) => {
    switch (intent) {
      case 'criar_produto': {
        await base44.entities.Produto.create({ nome: String(parameters.nome || 'Produto').trim(), preco_venda: Number(parameters.preco_venda) || 0, quantidade: 0, quantidade_minima: 0 });
        return { acao: 'Produto cadastrado', detalhes: parameters.nome };
      }
      case 'registrar_venda': {
        const prod = (produtos || []).find(p => p.nome.toLowerCase() === String(parameters.produto_nome || '').toLowerCase());
        if (!prod) return { acao: 'Produto não encontrado', detalhes: parameters.produto_nome, erro: true };
        const qtd = Number(parameters.quantidade) || 1;
        if (qtd > prod.quantidade) return { acao: 'Estoque insuficiente', detalhes: `Há apenas ${prod.quantidade} de ${prod.nome}`, erro: true };
        const total = prod.preco_venda * qtd;
        const lucro = (prod.preco_venda - (prod.preco_custo || 0)) * qtd;
        await base44.entities.Venda.create({ produto_id: prod.id, produto_nome: prod.nome, quantidade: qtd, preco_unitario: prod.preco_venda, custo_unitario: prod.preco_custo || 0, total, lucro, data: new Date().toISOString() });
        await base44.entities.Produto.update(prod.id, { quantidade: prod.quantidade - qtd });
        return { acao: 'Venda registrada', detalhes: `${qtd}x ${prod.nome} = ${formatCurrency(total)}` };
      }
      case 'criar_cliente': {
        await base44.entities.Cliente.create({ nome: String(parameters.nome || '').trim(), telefone: String(parameters.telefone || ''), limite_credito: 0, status: 'ativo' });
        return { acao: 'Cliente cadastrado', detalhes: parameters.nome };
      }
      case 'registrar_fiado': {
        const cli = (clientes || []).find(c => c.nome.toLowerCase() === String(parameters.cliente_nome || '').toLowerCase());
        if (!cli) return { acao: 'Cliente não encontrado', detalhes: parameters.cliente_nome, erro: true };
        const valor = Number(parameters.valor) || 0;
        if (valor <= 0) return { acao: 'Valor inválido', detalhes: '', erro: true };
        await base44.entities.MovimentacaoFiado.create({ cliente_id: cli.id, cliente_nome: cli.nome, tipo: 'compra', valor, descricao: String(parameters.descricao || 'Compra fiada'), data: new Date().toISOString() });
        return { acao: 'Compra fiada registrada', detalhes: `${cli.nome}: ${formatCurrency(valor)}` };
      }
      case 'consultar_saldo': {
        const cli = (clientes || []).find(c => c.nome.toLowerCase() === String(parameters.cliente_nome || '').toLowerCase());
        if (!cli) return { acao: 'Cliente não encontrado', detalhes: parameters.cliente_nome, erro: true };
        const movs = await base44.entities.MovimentacaoFiado.filter({ cliente_id: cli.id });
        const saldo = movs.reduce((s, m) => s + (m.tipo === 'compra' ? (m.valor || 0) : -(m.valor || 0)), 0);
        return { acao: 'Saldo consultado', detalhes: `${cli.nome}: ${formatCurrency(saldo)}`, respostaExtra: `${cli.nome} deve ${formatCurrency(saldo)} no momento.` };
      }
      default:
        return { acao: 'Sem ação', detalhes: '', erro: true };
    }
  };

  const handleSend = async (texto) => {
    texto = (texto ?? input).trim();
    if (!texto || sending) return;
    setInput('');
    setSending(true);
    try {
      await base44.entities.EventoAssistente.create({
        remetente: 'lojista',
        mensagem_original: texto,
        status: 'entendido',
        data: new Date().toISOString(),
      });
      notifyDataChanged();

      const result = await interpretar(texto);
      const { intent, parameters, resposta } = result || {};
      const exec = await executarAcao(intent, parameters || {});

      await base44.entities.EventoAssistente.create({
        remetente: 'sistema',
        mensagem_original: exec.respostaExtra || resposta || 'Não consegui processar sua mensagem.',
        intencao: intent || 'desconhecido',
        acao_realizada: exec.acao,
        detalhes: exec.detalhes || '',
        status: exec.erro ? 'erro' : 'executado',
        data: new Date().toISOString(),
      });
      if (!exec.erro) notifyDataChanged();
    } catch (err) {
      await base44.entities.EventoAssistente.create({
        remetente: 'sistema',
        mensagem_original: 'Não consegui processar sua mensagem agora. Tente novamente.',
        status: 'erro',
        data: new Date().toISOString(),
      }).catch(() => { });
      notifyDataChanged();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm flex flex-col h-[70vh] min-h-[480px]">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"><Bot className="w-5 h-5 text-primary-foreground" /></div>
            <div>
              <p className="font-heading font-semibold">Assistente WhatsApp</p>
              <p className="text-xs text-primary flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> Online</p>
            </div>
            <Badge variant="outline" className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Demonstrativo</Badge>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-2/3" />)}</div>
            ) : ordered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4"><Sparkles className="w-8 h-8" /></div>
                <h3 className="font-heading font-semibold">Converse com seu assistente</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Envie comandos por texto para cadastrar produtos, registrar vendas, clientes e fiado. As ações são salvas automaticamente.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 w-full max-w-md">
                  {exemplos.map((ex) => (
                    <button key={ex} onClick={() => handleSend(ex)} className="text-left text-sm p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              ordered.map(ev => {
                const isUser = ev.remetente === 'lojista';
                return (
                  <div key={ev.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md'}`}>
                        {ev.mensagem_original}
                      </div>
                      {!isUser && ev.status !== 'erro' && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600"><Brain className="w-3 h-3" /> Intenção classificada</span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"><Database className="w-3 h-3" /> Banco atualizado</span>
                        </div>
                      )}
                      {!isUser && ev.status === 'erro' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 mt-1.5"><AlertTriangle className="w-3 h-3" /> {ev.acao_realizada || 'Não foi possível'}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">{formatTime(ev.data)}</span>
                    </div>
                  </div>
                );
              })
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-border flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite um comando..." className="h-11 bg-card" disabled={sending} />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !input.trim()}><Send className="w-4 h-4" /></Button>
          </form>
        </Card>

        <Card className="shadow-sm p-4">
          <h3 className="font-heading font-semibold mb-1">Histórico de automações</h3>
          <p className="text-xs text-muted-foreground mb-4">Auditoria das ações</p>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (eventos || []).filter(e => e.remetente === 'sistema').length === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">As ações realizadas pelo assistente aparecerão aqui com data e status.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[56vh] overflow-y-auto no-scrollbar">
              {(eventos || []).filter(e => e.remetente === 'sistema').map(ev => (
                <div key={ev.id} className="p-3 rounded-lg border border-border/70">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">{ev.intencao || 'ação'}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${ev.status === 'erro' ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
                      {ev.status === 'erro' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} {ev.status === 'erro' ? 'Falhou' : 'Concluído'}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{ev.acao_realizada || '—'}</p>
                  {ev.detalhes && <p className="text-xs text-muted-foreground mt-0.5">{ev.detalhes}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDateTime(ev.data)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}