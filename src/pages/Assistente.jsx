import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAsync, notifyDataChanged } from '@/hooks/useAsync';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';
import { Send, Bot, Sparkles, CheckCircle2, Brain, Database, AlertTriangle, ShieldCheck, Mic, Square } from 'lucide-react';

const exemplos = [
  'Cadastre produto Refrigerante 2L por 8 reais',
  'Vendi 2 Refrigerante 2L para o João',
  'Cadastre cliente João telefone 11999999999',
  'João levou 15 reais fiado',
];

// Compara nomes ignorando acentos, maiúsculas e espaços extras
const norm = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const findByName = (lista, nome) => {
  const alvo = norm(nome);
  if (!alvo) return null;
  return (lista || []).find(i => norm(i.nome) === alvo)
    || (lista || []).find(i => norm(i.nome).includes(alvo) || alvo.includes(norm(i.nome)))
    || null;
};

export default function Assistente() {
  const { data, loading } = useAsync(() => Promise.all([
    base44.entities.EventoAssistente.list('-data', 100),
    base44.entities.Produto.list('nome', 500),
    base44.entities.Cliente.list('nome', 500),
  ]), []);
  const [eventos] = data || [null, null, null];

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const inputRef = useRef('');
  const stopRequestedRef = useRef(false);

  useEffect(() => { inputRef.current = input; }, [input]);

  const speechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const ordered = (eventos || []).slice().reverse();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [eventos, sending]);

  useEffect(() => () => { stopRequestedRef.current = true; recognitionRef.current?.abort?.(); }, []);

  const pararMic = () => {
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const iniciarReconhecimento = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let texto = '';
      for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript;
      const base = baseTextRef.current;
      setInput((base ? `${base} ` : '') + texto.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      // 'no-speech' é rotineiro em pausas longas; o onend religa a escuta
      if (e.error === 'no-speech') return;
      stopRequestedRef.current = true;
      setRecording(false);
      const msgs = {
        'not-allowed': 'Permita o acesso ao microfone no navegador para usar o comando de voz.',
        'service-not-allowed': 'O navegador bloqueou o serviço de voz. Use o Chrome ou o Edge.',
        'network': 'O serviço de reconhecimento de voz não respondeu. Verifique sua conexão e tente de novo.',
        'audio-capture': 'Nenhum microfone foi encontrado neste dispositivo.',
      };
      toast({ title: 'Microfone', description: msgs[e.error] || `Erro no reconhecimento de voz (${e.error}).`, variant: 'destructive' });
    };
    rec.onend = () => {
      // O Chrome encerra a escuta sozinho após alguns segundos de silêncio;
      // religa preservando o texto já transcrito, até o usuário clicar em parar.
      if (!stopRequestedRef.current) {
        baseTextRef.current = inputRef.current.trim();
        try { rec.start(); return; } catch { /* instância inválida: encerra */ }
      }
      setRecording(false);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const toggleMic = async () => {
    if (recording) {
      pararMic();
      return;
    }
    if (!speechSupported) {
      toast({ title: 'Microfone', description: 'Seu navegador não suporta reconhecimento de voz. Use o Chrome ou o Edge.', variant: 'destructive' });
      return;
    }
    try {
      // Dispara o pedido de permissão explicitamente (prompt do navegador)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast({ title: 'Microfone bloqueado', description: 'Permita o acesso ao microfone (ícone de cadeado na barra de endereço) e tente de novo.', variant: 'destructive' });
      return;
    }
    baseTextRef.current = input.trim();
    stopRequestedRef.current = false;
    try {
      iniciarReconhecimento();
      setRecording(true);
    } catch (err) {
      console.error('Falha ao iniciar reconhecimento de voz', err);
      toast({ title: 'Microfone', description: 'Não foi possível iniciar o reconhecimento de voz.', variant: 'destructive' });
    }
  };

  const interpretar = async (texto, produtos, clientes) => {
    const prompt = `Você é o assistente do SolveTech Varejo, um sistema para pequenos comerciantes brasileiros. Interprete a mensagem do lojista e extraia a intenção e os dados.

Produtos cadastrados: ${(produtos || []).map(p => p.nome).join(', ') || 'nenhum'}
Clientes cadastrados: ${(clientes || []).map(c => c.nome).join(', ') || 'nenhum'}

Intenções possíveis:
- criar_produto: cadastrar um novo produto. Preencha nome, preco_venda e, se informados, preco_custo e quantidade.
- registrar_venda: registrar uma venda (diminui estoque). Preencha produto_nome e quantidade. Se o lojista disser para quem vendeu, preencha cliente_nome. Se disser que foi fiado/na caderneta/para pagar depois, use fiado: true.
- criar_cliente: cadastrar cliente. Preencha nome e telefone.
- registrar_fiado: registrar dívida fiada sem venda de produto específico (aumenta saldo devedor). Preencha cliente_nome, valor e descricao.
- registrar_pagamento: cliente pagou/abateu parte do fiado. Preencha cliente_nome e valor.
- consultar_saldo: consultar saldo devedor de um cliente. Preencha cliente_nome.
- desconhecido: não foi possível entender.

Regras:
- Valores em reais devem virar números (ex: "8 reais" -> 8, "R$ 2,50" -> 2.5).
- Use os nomes de produtos/clientes cadastrados quando a mensagem se referir a eles, mesmo com pequenas variações.
- Campos que não se aplicam à intenção: use "" para textos, 0 para números e false para fiado.
- Se faltar informação essencial, use intent "desconhecido" e peça o dado que falta na resposta.
- resposta: mensagem curta e amigável em português brasileiro confirmando a ação (ou pedindo o que falta).

Mensagem do lojista: "${texto}"`;
    // O structured output do InvokeLLM exige "required" com todas as chaves de
    // "properties" e rejeita objetos livres (additionalProperties: true),
    // por isso o schema é plano em vez de um objeto "parameters" dinâmico.
    const r = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          intent: { type: 'string' },
          resposta: { type: 'string' },
          produto_nome: { type: 'string' },
          cliente_nome: { type: 'string' },
          nome: { type: 'string' },
          telefone: { type: 'string' },
          quantidade: { type: 'number' },
          valor: { type: 'number' },
          preco_venda: { type: 'number' },
          preco_custo: { type: 'number' },
          descricao: { type: 'string' },
          fiado: { type: 'boolean' },
        },
        required: ['intent', 'resposta', 'produto_nome', 'cliente_nome', 'nome', 'telefone', 'quantidade', 'valor', 'preco_venda', 'preco_custo', 'descricao', 'fiado'],
        additionalProperties: false,
      },
    });
    const { intent, resposta, ...parameters } = r || {};
    return { intent, resposta, parameters };
  };

  const executarAcao = async (intent, parameters = {}, produtos = [], clientes = []) => {
    switch (intent) {
      case 'criar_produto': {
        const nome = String(parameters.nome || parameters.produto_nome || '').trim();
        if (!nome) return { acao: 'Nome do produto não informado', detalhes: '', erro: true };
        const existente = findByName(produtos, nome);
        if (existente) return { acao: 'Produto já cadastrado', detalhes: existente.nome, erro: true };
        await base44.entities.Produto.create({
          nome,
          preco_venda: Number(parameters.preco_venda) || 0,
          preco_custo: Number(parameters.preco_custo) || 0,
          quantidade: Number(parameters.quantidade) || 0,
          quantidade_minima: 0,
        });
        return { acao: 'Produto cadastrado', detalhes: nome };
      }
      case 'registrar_venda': {
        const prod = findByName(produtos, parameters.produto_nome);
        if (!prod) return { acao: 'Produto não encontrado', detalhes: parameters.produto_nome, erro: true };
        const qtd = Number(parameters.quantidade) || 1;
        if (qtd > prod.quantidade) return { acao: 'Estoque insuficiente', detalhes: `Há apenas ${prod.quantidade} de ${prod.nome}`, erro: true };

        let cli = null;
        if (parameters.cliente_nome) {
          cli = findByName(clientes, parameters.cliente_nome);
          if (!cli) return { acao: 'Cliente não encontrado', detalhes: `Cadastre o cliente "${parameters.cliente_nome}" antes de registrar a venda para ele.`, erro: true };
        }
        const fiado = Boolean(parameters.fiado);
        if (fiado && !cli) return { acao: 'Cliente obrigatório', detalhes: 'Venda fiada precisa de um cliente cadastrado.', erro: true };

        const total = prod.preco_venda * qtd;
        const lucro = (prod.preco_venda - (prod.preco_custo || 0)) * qtd;
        await base44.entities.Venda.create({
          produto_id: prod.id,
          produto_nome: prod.nome,
          quantidade: qtd,
          preco_unitario: prod.preco_venda,
          custo_unitario: prod.preco_custo || 0,
          total,
          lucro,
          descricao: cli ? `Venda para ${cli.nome}${fiado ? ' (fiado)' : ''}` : '',
          data: new Date().toISOString(),
        });
        await base44.entities.Produto.update(prod.id, { quantidade: prod.quantidade - qtd });
        if (fiado && cli) {
          await base44.entities.MovimentacaoFiado.create({
            cliente_id: cli.id,
            cliente_nome: cli.nome,
            tipo: 'compra',
            valor: total,
            descricao: `${qtd}x ${prod.nome} (fiado)`,
            data: new Date().toISOString(),
          });
        }
        const paraQuem = cli ? ` para ${cli.nome}${fiado ? ' (fiado)' : ''}` : '';
        return { acao: fiado ? 'Venda fiada registrada' : 'Venda registrada', detalhes: `${qtd}x ${prod.nome} = ${formatCurrency(total)}${paraQuem}` };
      }
      case 'criar_cliente': {
        const nome = String(parameters.nome || parameters.cliente_nome || '').trim();
        if (!nome) return { acao: 'Nome do cliente não informado', detalhes: '', erro: true };
        const existente = findByName(clientes, nome);
        if (existente) return { acao: 'Cliente já cadastrado', detalhes: existente.nome, erro: true };
        await base44.entities.Cliente.create({ nome, telefone: String(parameters.telefone || ''), limite_credito: 0, status: 'ativo' });
        return { acao: 'Cliente cadastrado', detalhes: nome };
      }
      case 'registrar_fiado': {
        const cli = findByName(clientes, parameters.cliente_nome);
        if (!cli) return { acao: 'Cliente não encontrado', detalhes: parameters.cliente_nome, erro: true };
        const valor = Number(parameters.valor) || 0;
        if (valor <= 0) return { acao: 'Valor inválido', detalhes: '', erro: true };
        await base44.entities.MovimentacaoFiado.create({ cliente_id: cli.id, cliente_nome: cli.nome, tipo: 'compra', valor, descricao: String(parameters.descricao || 'Compra fiada'), data: new Date().toISOString() });
        return { acao: 'Compra fiada registrada', detalhes: `${cli.nome}: ${formatCurrency(valor)}` };
      }
      case 'registrar_pagamento': {
        const cli = findByName(clientes, parameters.cliente_nome);
        if (!cli) return { acao: 'Cliente não encontrado', detalhes: parameters.cliente_nome, erro: true };
        const valor = Number(parameters.valor) || 0;
        if (valor <= 0) return { acao: 'Valor inválido', detalhes: '', erro: true };
        await base44.entities.MovimentacaoFiado.create({ cliente_id: cli.id, cliente_nome: cli.nome, tipo: 'pagamento', valor, descricao: 'Pagamento registrado pelo assistente', data: new Date().toISOString() });
        return { acao: 'Pagamento registrado', detalhes: `${cli.nome}: ${formatCurrency(valor)}` };
      }
      case 'consultar_saldo': {
        const cli = findByName(clientes, parameters.cliente_nome);
        if (!cli) return { acao: 'Cliente não encontrado', detalhes: parameters.cliente_nome, erro: true };
        const movs = await base44.entities.MovimentacaoFiado.filter({ cliente_id: cli.id });
        const saldo = movs.reduce((s, m) => s + (m.tipo === 'compra' ? (m.valor || 0) : -(m.valor || 0)), 0);
        return { acao: 'Saldo consultado', detalhes: `${cli.nome}: ${formatCurrency(saldo)}`, respostaExtra: `${cli.nome} deve ${formatCurrency(saldo)} no momento.` };
      }
      default:
        // Mensagem sem ação (saudação, pedido de esclarecimento): responde sem marcar erro
        return { acao: 'Nenhuma ação necessária', detalhes: '', neutro: true };
    }
  };

  const handleSend = async (texto) => {
    texto = (texto ?? input).trim();
    if (!texto || sending) return;
    if (recording) pararMic();
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

      // Busca listas atualizadas na hora de executar, evitando dados defasados do render
      const [produtos, clientes] = await Promise.all([
        base44.entities.Produto.list('nome', 500),
        base44.entities.Cliente.list('nome', 500),
      ]);

      const result = await interpretar(texto, produtos, clientes);
      const { intent, parameters, resposta } = result || {};
      const exec = await executarAcao(intent, parameters || {}, produtos, clientes);

      await base44.entities.EventoAssistente.create({
        remetente: 'sistema',
        mensagem_original: exec.erro ? `${exec.acao}${exec.detalhes ? `: ${exec.detalhes}` : ''}` : (exec.respostaExtra || resposta || 'Não consegui processar sua mensagem.'),
        intencao: intent || 'desconhecido',
        acao_realizada: exec.acao,
        detalhes: exec.detalhes || '',
        status: exec.erro ? 'erro' : (exec.neutro ? 'classificado' : 'executado'),
        data: new Date().toISOString(),
      });
      notifyDataChanged();
    } catch (err) {
      console.error('Assistente: falha ao processar mensagem', err);
      const motivo = err?.message || err?.data?.message || '';
      await base44.entities.EventoAssistente.create({
        remetente: 'sistema',
        mensagem_original: `Não consegui processar sua mensagem agora. Tente novamente.${motivo ? ` (detalhe técnico: ${motivo})` : ''}`,
        acao_realizada: 'Erro interno',
        detalhes: motivo,
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
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Envie comandos por texto ou voz para cadastrar produtos, registrar vendas, clientes e fiado. As ações são salvas automaticamente.</p>
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
                      {!isUser && ev.status === 'executado' && (
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={recording ? 'Ouvindo... fale agora' : 'Digite um comando...'}
              className="h-11 bg-card"
              disabled={sending}
            />
            <Button
              type="button"
              size="icon"
              variant={recording ? 'destructive' : 'outline'}
              className={`h-11 w-11 shrink-0 ${recording ? 'animate-pulse' : ''}`}
              onClick={toggleMic}
              disabled={sending}
              title={speechSupported ? (recording ? 'Parar gravação' : 'Falar comando') : 'Reconhecimento de voz não suportado neste navegador'}
            >
              {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
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
