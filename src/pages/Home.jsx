import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/hooks/useAsync';
import MetricCard from '@/components/MetricCard';
import EmptyState from '@/components/EmptyState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber, formatDateTime, isSameDay } from '@/lib/format';
import { Package, Boxes, BookUser, ShoppingCart, Wallet, TrendingUp, Bot, ArrowUpRight, Sparkles, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function Home() {
    const { data, loading } = useAsync(() => Promise.all([
        base44.entities.Produto.list('nome', 1000),
        base44.entities.Cliente.list('nome', 1000),
        base44.entities.Venda.list('-data', 1000),
        base44.entities.MovimentacaoFiado.list('-data', 2000),
        base44.entities.EventoAssistente.list('-data', 6),
    ]), []);

    const [produtos, clientes, vendas, movFiado, eventos] = data || [null, null, null, null, null];

    const valorEstoque = (produtos || []).reduce((s, p) => s + (p.preco_venda || 0) * (p.quantidade || 0), 0);
    const totalFiado = (movFiado || []).reduce((s, m) => s + (m.tipo === 'compra' ? (m.valor || 0) : -(m.valor || 0)), 0);
    const clientesAtivos = (clientes || []).filter(c => c.status !== 'arquivado').length;
    const vendasHoje = (vendas || []).filter(v => isSameDay(v.data, new Date())).reduce((s, v) => s + (v.total || 0), 0);
    const lucroHoje = (vendas || []).filter(v => isSameDay(v.data, new Date())).reduce((s, v) => s + (v.lucro || 0), 0);

    const chartData = React.useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const v = (vendas || []).filter(x => isSameDay(x.data, d)).reduce((s, x) => s + (x.total || 0), 0);
            const f = (movFiado || []).filter(m => m.tipo === 'compra' && isSameDay(m.data, d)).reduce((s, m) => s + (m.valor || 0), 0);
            days.push({ dia: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').substring(0, 3), Vendas: v, Fiado: f });
        }
        return days;
    }, [vendas, movFiado]);

    const topProdutos = React.useMemo(() => {
        if (!vendas || vendas.length === 0) return [];
        const map = {};
        vendas.forEach(v => { map[v.produto_nome] = (map[v.produto_nome] || 0) + (v.quantidade || 0); });
        return Object.entries(map).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
    }, [vendas]);

    const semDados = !loading && (produtos || []).length === 0 && (clientes || []).length === 0 && (vendas || []).length === 0;

    return (
        <div className="space-y-6 fade-in">
            {semDados && (
                <Card className="p-5 border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-heading font-semibold">Bem-vindo ao SolveTech Varejo!</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">Cadastre seus produtos e clientes para começar. Seus números aparecerão aqui automaticamente.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm"><Link to="/estoque">Cadastrar produto</Link></Button>
                        <Button asChild size="sm"><Link to="/caderneta">Cadastrar cliente</Link></Button>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
                <MetricCard icon={Package} label="Produtos" value={formatNumber((produtos || []).length)} accent="emerald" loading={loading} />
                <MetricCard icon={Boxes} label="Valor em estoque" value={formatCurrency(valorEstoque)} accent="blue" loading={loading} />
                <MetricCard icon={BookUser} label="Clientes" value={formatNumber(clientesAtivos)} accent="emerald" loading={loading} />
                <MetricCard icon={ShoppingCart} label="Vendas hoje" value={formatCurrency(vendasHoje)} accent="blue" loading={loading} />
                <MetricCard icon={Wallet} label="Total fiado" value={formatCurrency(totalFiado)} accent={totalFiado > 0 ? 'red' : 'emerald'} loading={loading} />
                <MetricCard icon={TrendingUp} label="Lucro hoje" value={formatCurrency(lucroHoje)} accent="emerald" loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-4 md:p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-heading font-semibold">Vendas vs Fiado</h3>
                            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                        </div>
                    </div>
                    {loading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : chartData.every(d => d.Vendas === 0 && d.Fiado === 0) ? (
                        <EmptyState icon={TrendingUp} title="Sem movimentações ainda" description="Quando você registrar vendas e fiados, o gráfico aparecerá aqui." />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                                <Legend />
                                <Bar dataKey="Vendas" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Fiado" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card className="p-4 md:p-5 shadow-sm">
                    <h3 className="font-heading font-semibold mb-1">Produtos mais vendidos</h3>
                    <p className="text-xs text-muted-foreground mb-4">Por quantidade</p>
                    {loading ? (
                        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : topProdutos.length === 0 ? (
                        <EmptyState icon={Package} title="Nenhuma venda ainda" description="Suas vendas aparecerão aqui assim que registrá-las." />
                    ) : (
                        <div className="space-y-3">
                            {topProdutos.map((p, i) => {
                                const max = topProdutos[0].qtd || 1;
                                return (
                                    <div key={p.nome}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="font-medium truncate pr-2"><span className="text-muted-foreground mr-1.5">{i + 1}.</span>{p.nome}</span>
                                            <span className="font-semibold shrink-0">{formatNumber(p.qtd)}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-primary rounded-full" style={{ width: `${(p.qtd / max) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            <Card className="p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Bot className="w-4 h-4" /></div>
                        <div>
                            <h3 className="font-heading font-semibold">Assistente WhatsApp</h3>
                            <p className="text-xs text-muted-foreground">Últimas ações</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">Ver tudo<ArrowUpRight className="w-4 h-4" /></Button>
                </div>
                <Link to="/assistente" className="block">
                    {loading ? (
                        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : (eventos || []).length === 0 ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                            <p className="text-sm text-muted-foreground">Nenhuma ação do assistente ainda. Acesse o assistente para registrar vendas e produtos por voz ou texto.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(eventos || []).map(ev => (
                                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.status === 'erro' ? 'bg-red-500' : ev.status === 'executado' ? 'bg-primary' : 'bg-amber-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{ev.mensagem_original}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{ev.acao_realizada || ev.intencao || 'Mensagem'} · {formatDateTime(ev.data)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Link>
            </Card>
        </div>
    );
}