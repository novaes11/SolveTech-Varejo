import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAsync, notifyDataChanged } from '@/hooks/useAsync';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import MetricCard from '@/components/MetricCard';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import ProdutoFormModal from '@/components/estoque/ProdutoFormModal';
import AjusteEstoqueModal from '@/components/estoque/AjusteEstoqueModal';
import ProdutoStatusBadge from '@/components/estoque/ProdutoStatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Package, Boxes, Wallet, Pencil, Trash2, ArrowDownUp, AlertTriangle, ScanLine } from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

export default function Estoque() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [busca, setBusca] = useState(searchParams.get('busca') || '');
    const { data: produtos, loading } = useAsync(() => base44.entities.Produto.list('nome', 1000), []);
    const { toast } = useToast();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [ajuste, setAjuste] = useState(null);
    const [excluir, setExcluir] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [defaultCodigoBarras, setDefaultCodigoBarras] = useState('');

    const filtrados = (produtos || []).filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.categoria || '').toLowerCase().includes(busca.toLowerCase()) || (p.codigo_barras || '').toLowerCase().includes(busca.toLowerCase())
    );

    const totalItens = (produtos || []).reduce((s, p) => s + (p.quantidade || 0), 0);
    const baixoEstoque = (produtos || []).filter(p => p.quantidade <= (p.quantidade_minima || 0)).length;
    const valorTotal = (produtos || []).reduce((s, p) => s + (p.preco_venda || 0) * (p.quantidade || 0), 0);

    const onSearch = (e) => { e.preventDefault(); setSearchParams(busca ? { busca } : {}); };

    const handleBarcodeScan = (code) => {
        const found = (produtos || []).find(p => p.codigo_barras === code);
        if (found) {
            setBusca(code);
            toast({ title: 'Produto encontrado', description: found.nome });
        } else {
            setDefaultCodigoBarras(code);
            setEditing(null);
            setFormOpen(true);
        }
    };

    const handleExcluir = async () => {
        setDeleting(true);
        try {
            await base44.entities.Produto.delete(excluir.id);
            toast({ title: 'Produto excluído', description: `${excluir.nome} foi removido do estoque.` });
            notifyDataChanged();
            setExcluir(null);
        } catch (err) {
            toast({ title: 'Não foi possível excluir', description: 'Tente novamente em instantes.', variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard icon={Boxes} label="Total de itens" value={formatNumber(totalItens)} accent="blue" loading={loading} />
                <MetricCard icon={AlertTriangle} label="Baixo estoque" value={formatNumber(baixoEstoque)} accent="amber" loading={loading} />
                <MetricCard icon={Wallet} label="Valor em estoque" value={formatCurrency(valorTotal)} accent="emerald" loading={loading} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={onSearch} className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou categoria..." className="pl-9 h-10 bg-card" />
                </form>
                <Button variant="outline" onClick={() => setScannerOpen(true)} className="h-10 gap-2"><ScanLine className="w-4 h-4" /> Escanear</Button>
                <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="h-10 gap-2"><Plus className="w-4 h-4" /> Novo produto</Button>
            </div>

            <Card className="shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : filtrados.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title={busca ? 'Nenhum produto encontrado' : 'Seu estoque ainda está vazio'}
                        description={busca ? 'Tente buscar por outro nome.' : 'Cadastre seu primeiro produto para começar a controlar seu estoque.'}
                        actionLabel={busca ? undefined : 'Cadastrar primeiro produto'}
                        onAction={busca ? undefined : () => { setEditing(null); setFormOpen(true); }}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-right">Preço</TableHead>
                                    <TableHead className="text-center">Qtd</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtrados.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="font-medium">{p.nome}</div>
                                            {p.categoria && <div className="text-xs text-muted-foreground">{p.categoria}</div>}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(p.preco_venda)}</TableCell>
                                        <TableCell className="text-center">{formatNumber(p.quantidade)}</TableCell>
                                        <TableCell className="text-center"><ProdutoStatusBadge quantidade={p.quantidade} quantidade_minima={p.quantidade_minima} /></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAjuste(p)} title="Ajustar estoque"><ArrowDownUp className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(p); setFormOpen(true); }} title="Editar"><Pencil className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setExcluir(p)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            <ProdutoFormModal open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v) setDefaultCodigoBarras(''); }} produto={editing} defaultCodigoBarras={defaultCodigoBarras} />
            <AjusteEstoqueModal open={!!ajuste} onOpenChange={(v) => !v && setAjuste(null)} produto={ajuste} />
            <ConfirmDialog
                open={!!excluir}
                onOpenChange={(v) => !v && setExcluir(null)}
                title="Excluir produto"
                description={`Deseja realmente excluir "${excluir?.nome}"? Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                onConfirm={handleExcluir}
                loading={deleting}
            />
            <BarcodeScannerModal open={scannerOpen} onOpenChange={setScannerOpen} onCodeScanned={handleBarcodeScan} />
        </div>
    );
}