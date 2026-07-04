import { useState, useEffect } from 'react'
import { ShoppingCart, RefreshCw, AlertCircle, Loader2, Bot, Monitor } from 'lucide-react'
import { getVendas } from '../services/api'

// Formata a data UTC do backend pro fuso local, estilo "03/07 17:42"
function formatarData(iso) {
  const data = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function BadgeOrigem({ origem }) {
  const ehWhatsApp = origem === 'whatsapp'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        ehWhatsApp ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {ehWhatsApp ? <Bot className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
      {ehWhatsApp ? 'WhatsApp' : 'Painel'}
    </span>
  )
}

export default function Vendas() {
  const [vendas, setVendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  // buscar() não mexe no loading de forma síncrona — o estado já nasce true,
  // então o useEffect pode chamar direto sem disparar render em cascata
  const buscar = () => {
    getVendas()
      .then(({ data }) => {
        setVendas(data)
        setErro(null)
      })
      .catch(() => setErro('Não foi possível conectar ao backend. O servidor está rodando?'))
      .finally(() => setLoading(false))
  }

  const carregarVendas = () => {
    setLoading(true)
    buscar()
  }

  useEffect(() => { buscar() }, [])

  const totalVendido = vendas.reduce((acc, v) => acc + v.valor_total, 0)

  return (
    <div className="space-y-6">
      {/* Barra de ações: resumo + atualizar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {vendas.length} venda{vendas.length !== 1 && 's'} registrada{vendas.length !== 1 && 's'} —{' '}
          <span className="font-semibold text-gray-700">R$ {totalVendido.toFixed(2)}</span>
        </p>
        <button
          onClick={carregarVendas}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Mensagem de erro */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* Tabela de vendas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando vendas...
          </div>
        ) : vendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Nenhuma venda registrada ainda</p>
            <p className="text-xs mt-1">
              Manda um áudio no WhatsApp tipo &quot;vendi um pastel pro Kenzo&quot; que ela aparece aqui!
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Data
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Produto
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Qtd
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Cliente
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Valor
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Origem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendas.map((venda) => (
                <tr key={venda.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatarData(venda.criado_em)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{venda.produto_nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">{venda.quantidade}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {venda.cliente_nome || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-800">
                    R$ {venda.valor_total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <BadgeOrigem origem={venda.origem} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
