import { useState, useEffect } from 'react'
import { Users, Plus, Search, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { getClientes, getCliente, criarCliente } from '../services/api'

export default function Caderneta() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', telefone: '', limite_fiado: '' })
  const [clienteSelecionado, setClienteSelecionado] = useState(null)

  const carregarClientes = () => {
    setLoading(true)
    getClientes()
      .then(({ data }) => {
        setClientes(data)
        setErro(null)
      })
      .catch(() => setErro('Não foi possível conectar ao backend. O servidor está rodando?'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarClientes() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await criarCliente({
        nome: form.nome,
        telefone: form.telefone,
        limite_fiado: parseFloat(form.limite_fiado) || 0,
      })
      setForm({ nome: '', telefone: '', limite_fiado: '' })
      setShowForm(false)
      carregarClientes()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao cadastrar cliente')
    }
  }

  const verDetalhes = async (id) => {
    try {
      const { data } = await getCliente(id)
      setClienteSelecionado(data)
    } catch {
      setErro('Erro ao buscar detalhes do cliente')
    }
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  return (
    <div className="space-y-6">
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
          />
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cadastrar cliente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nome completo"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            <input
              type="text"
              placeholder="Telefone (WhatsApp)"
              required
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Limite de fiado (R$)"
              value={form.limite_fiado}
              onChange={(e) => setForm({ ...form, limite_fiado: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de clientes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando clientes...
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">
                {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clientesFiltrados.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => verDetalhes(cliente.id)}
                  className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors text-left ${
                    clienteSelecionado?.id === cliente.id ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar com as iniciais do cliente */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                      {cliente.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cliente.nome}</p>
                      <p className="text-xs text-gray-400">{cliente.telefone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      Limite: R$ {cliente.limite_fiado.toFixed(2)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Painel de detalhes do cliente selecionado */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {clienteSelecionado ? (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                  {clienteSelecionado.nome.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-base font-semibold text-gray-800">
                  {clienteSelecionado.nome}
                </h3>
                <p className="text-xs text-gray-400">{clienteSelecionado.telefone}</p>
              </div>

              {/* Resumo financeiro */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Limite de fiado</span>
                  <span className="font-medium text-gray-700">
                    R$ {clienteSelecionado.limite_fiado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Saldo devedor</span>
                  <span
                    className={`font-semibold ${
                      clienteSelecionado.saldo_devedor > 0
                        ? 'text-red-500'
                        : 'text-emerald-500'
                    }`}
                  >
                    R$ {clienteSelecionado.saldo_devedor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Crédito disponível</span>
                  <span className="font-medium text-blue-500">
                    R$ {Math.max(
                      clienteSelecionado.limite_fiado - clienteSelecionado.saldo_devedor,
                      0
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Histórico de movimentações */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Últimas movimentações
                </h4>
                {clienteSelecionado.fiados?.length > 0 ? (
                  <div className="space-y-2">
                    {clienteSelecionado.fiados.slice(0, 8).map((mov) => (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <p className="text-gray-700 text-xs">{mov.descricao}</p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(mov.criado_em).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            mov.tipo === 'compra' ? 'text-red-500' : 'text-emerald-500'
                          }`}
                        >
                          {mov.tipo === 'compra' ? '+' : '-'} R$ {mov.valor.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Nenhuma movimentação registrada
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm text-center">
                Selecione um cliente ao lado para ver os detalhes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
