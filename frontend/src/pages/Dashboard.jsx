import { useState, useEffect } from 'react'
import { Package, Users, Bot, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { getProdutos, getClientes } from '../services/api'

// Dados mockados da semana pra popular o gráfico enquanto o backend
// não tem endpoint de relatórios. Quando tiver, é só trocar o fetch.
const dadosSemana = [
  { dia: 'Seg', vendas: 320, fiado: 80 },
  { dia: 'Ter', vendas: 450, fiado: 120 },
  { dia: 'Qua', vendas: 280, fiado: 60 },
  { dia: 'Qui', vendas: 520, fiado: 200 },
  { dia: 'Sex', vendas: 680, fiado: 150 },
  { dia: 'Sáb', vendas: 890, fiado: 90 },
  { dia: 'Dom', vendas: 340, fiado: 40 },
]

// Tooltip customizado pra ficar bonito e combinar com o tema "tranquilo"
function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3">
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">R$ {entry.value.toFixed(2)}</span>
        </p>
      ))}
    </div>
  )
}

function CardResumo({ icon: Icon, titulo, valor, cor, bgCor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
      <div className={`w-12 h-12 rounded-xl ${bgCor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${cor}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-1">{titulo}</p>
        <p className="text-2xl font-bold text-gray-800">{valor}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [totalEstoque, setTotalEstoque] = useState(0)
  const [totalClientes, setTotalClientes] = useState(0)

  useEffect(() => {
    // Puxa os dados reais do backend pra popular os cards
    getProdutos()
      .then(({ data }) => {
        setTotalProdutos(data.length)
        const somaEstoque = data.reduce((acc, p) => acc + p.preco * p.quantidade, 0)
        setTotalEstoque(somaEstoque)
      })
      .catch(() => {
        // Se o backend estiver fora, os cards ficam zerados — sem drama
      })

    getClientes()
      .then(({ data }) => setTotalClientes(data.length))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <CardResumo
          icon={Package}
          titulo="Produtos cadastrados"
          valor={totalProdutos}
          cor="text-emerald-600"
          bgCor="bg-emerald-50"
        />
        <CardResumo
          icon={TrendingUp}
          titulo="Valor em estoque"
          valor={`R$ ${totalEstoque.toFixed(2)}`}
          cor="text-blue-600"
          bgCor="bg-blue-50"
        />
        <CardResumo
          icon={Users}
          titulo="Clientes na caderneta"
          valor={totalClientes}
          cor="text-amber-600"
          bgCor="bg-amber-50"
        />
        <CardResumo
          icon={Bot}
          titulo="Vendas da IA hoje"
          valor="—"
          cor="text-violet-600"
          bgCor="bg-violet-50"
        />
      </div>

      {/* Gráfico de Vendas vs Fiado */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-800">Vendas vs Fiado — Última semana</h3>
          <p className="text-sm text-gray-400 mt-1">
            Visão geral do faturamento e do quanto foi vendido no fiado
          </p>
        </div>

        {/* Galera, esse gráfico pega os dados da semana e plota vendas (verde)
            contra fiado (azul claro). Verde clarinho pra não dar ansiedade no
            dono da feira na hora de ver quem tá devendo. */}
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dadosSemana} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="dia"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 13 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 13 }}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip content={<TooltipCustom />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
            />
            <Bar
              dataKey="vendas"
              name="Vendas"
              fill="#34d399"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="fiado"
              name="Fiado"
              fill="#93c5fd"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
