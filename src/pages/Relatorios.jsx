import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAsync } from '@/hooks/useAsync';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import MetricCard from '@/components/MetricCard';
import EmptyState from '@/components/EmptyState';
import GastoFormModal from '@/components/GastoFormModal';
import { formatCurrency, startOfDay, withinPeriod } from '@/lib/format';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { ShoppingCart, Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, Receipt, Plus, Calendar } from 'lucide-react';

const periodos = [
    { key: '7', label: '7 dias', days: 7 },
    { key: '30', label: '30 dias', days: 30 },
    { key: '90', label: '90 dias', days: 90 },
    { key: 'all', label: 'Tudo', days: null },
];

export default function Relatorios() {
    const [periodo, setPeriodo] = useState('30');
    const [gastoOpen, setGastoOpen] = useState(false);
    const { data, loading } = useAsync(() => Promise.all([
        base44.entities.Venda.list('-data', 2000),
        base44.entities.MovimentacaoFiado.list('-data', 2000),
        base44.entities.Gasto.list('-data', 2000),
    ]), []);

    const [vendas, movs, gastos] = data || [null, null, null];

    const fromDate = useMemo(() => {
        const p = periodos.find(x => x.key === periodo);
        if (!p || !p.days) return null;
        const d = startOfDay(new Date());
        d.setDate(d.getDate() - (p.days - 1));
        return d;
    }, [periodo]);

    const fv = (vendas || []).filter(v => withinPeriod(v.data, fromDate));
    const fm = (movs || []).filter(m => withinPeriod(m.data, fromDate));
    const fg = (gastos || []).filter(g => withinPeriod(g.data, fromDate));

    const totalVendas = fv.reduce((s, v) => s + (v.total || 0), 0);
    const totalRecebido = fm.filter(m => m.tipo === 'pagamento').reduce((s, m) => s + (m.valor || 0), 0);
    const totalFiado = fm.filter(m => m.tipo === 'compra').reduce((s, m) => s + (m.valor || 0), 0);
    const totalGastos = fg.reduce((s, g) => s + (g.valor || 0), 0);
    const lucroBruto = fv.reduce((s, v) => s + (v.lucro || 0), 0);
    const lucroLiquido = lucroBruto - totalGastos;

    const semDados = !loading && fv.length === 0 && fm.length === 0 && fg.length === 0;

    const chartData = useMemo(() => {
        if (!fromDate) return [];
        const p = periodos.find(x => x.key === periodo);
        const days = p.days;
        const today = startOfDay(new Date());
        const arr = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const sameDay = (iso) => { const x = new Date(iso); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };
            arr.push({
                dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: days <= 30 ? '2-digit' : 'short' }),
                Vendas: fv.filter(v => sameDay(v.data)).reduce((s, v) => s + (v.total || 0), 0),
                Lucro: fv.filter(v => sameDay(v.data)).reduce((s, v) => s + (v.lucro || 0), 0),
                Gastos: fg.filter(g => sameDay(g.data)).reduce((s, g) => s + (g.valor || 0), 0),
            });
        }
        return arr;
    }, [fv, fg, fromDate, periodo]);

    return (
        <div className="space-y-6 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div className="flex bg-card border border-border rounded-lg p-1">
                        {periodos.map(p => (
                            <button
                                key={p.key}
                                onClick={() => setPeriodo(p.key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${periodo === p.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                <Button variant="outline" className="gap-2 self-start sm:self-auto" onClick={() => setGastoOpen(true)}><Plus className="w-4 h-4" /> Registrar gasto</Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
                <MetricCard icon={ShoppingCart} label="Vendas" value={formatCurrency(totalVendas)} accent="blue" loading={loading} />
                <MetricCard icon={ArrowDownCircle} label="Fiado" value={formatCurrency(totalFiado)} accent="red" loading={loading} />
                <MetricCard icon={ArrowUpCircle} label="Recebido" value={formatCurrency(totalRecebido)} accent="emerald" loading={loading} />
                <MetricCard icon={Receipt} label="Gastos" value={formatCurrency(totalGastos)} accent="amber" loading={loading} />
                <MetricCard icon={TrendingUp} label="Lucro líquido" value={formatCurrency(lucroLiquido)} accent={lucroLiquido >= 0 ? 'emerald' : 'red'} loading={loading} />
            </div>

            {semDados ? (
                <Card className="shadow-sm">
                    <EmptyState icon={TrendingUp} title="Ainda não há movimentações neste período" description="Registre vendas, pagamentos ou gastos para visualizar seus gráficos aqui." />
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-4 md:p-5 shadow-sm">
                        <h3 className="font-heading font-semibold mb-1">Vendas por dia</h3>
                        <p className="text-xs text-muted-foreground mb-4">Faturamento no período</p>
                        {loading ? <Skeleton className="h-56 w-full" /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                                    <Area type="monotone" dataKey="Vendas" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#gv)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    <Card className="p-4 md:p-5 shadow-sm">
                        <h3 className="font-heading font-semibold mb-1">Lucro por dia</h3>
                        <p className="text-xs text-muted-foreground mb-4">Lucro bruto das vendas</p>
                        {loading ? <Skeleton className="h-56 w-full" /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                                    <Line type="monotone" dataKey="Lucro" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>

                    <Card className="p-4 md:p-5 shadow-sm lg:col-span-2">
                        <h3 className="font-heading font-semibold mb-1">Gastos por dia</h3>
                        <p className="text-xs text-muted-foreground mb-4">Despesas registradas</p>
                        {loading ? <Skeleton className="h-56 w-full" /> : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                                    <Bar dataKey="Gastos" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </div>
            )}

            <GastoFormModal open={gastoOpen} onOpenChange={setGastoOpen} />
        </div>
    );
}