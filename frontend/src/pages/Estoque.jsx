import { useState, useEffect } from 'react'
import { Package, Plus, Search, AlertCircle, Loader2 } from 'lucide-react'
import { getProdutos, criarProduto, deletarProduto } from '../services/api'

export default function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', preco: '', quantidade: '' })

  const carregarProdutos = () => {
    setLoading(true)
    getProdutos()
      .then(({ data }) => {
        setProdutos(data)
        setErro(null)
      })
      .catch(() => setErro('Não foi possível conectar ao backend. O servidor está rodando?'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarProdutos() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await criarProduto({
        nome: form.nome,
        preco: parseFloat(form.preco),
        quantidade: parseInt(form.quantidade),
      })
      setForm({ nome: '', preco: '', quantidade: '' })
      setShowForm(false)
      carregarProdutos()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao cadastrar produto')
    }
  }

  const handleDeletar = async (id) => {
    if (!confirm('Tem certeza que quer remover este produto?')) return
    try {
      await deletarProduto(id)
      carregarProdutos()
    } catch {
      setErro('Erro ao remover produto')
    }
  }

  // Filtra os produtos pela busca digitada
  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Barra de ações: busca + botão adicionar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
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
          Novo produto
        </button>
      </div>

      {/* Formulário de cadastro rápido */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-in"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Cadastrar produto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nome do produto"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Preço (R$)"
              required
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            <input
              type="number"
              min="0"
              placeholder="Quantidade"
              required
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
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

      {/* Mensagem de erro */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* Tabela de produtos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando estoque...
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">
              {busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Produto
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Preço
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Qtd
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {produtosFiltrados.map((produto) => (
                <tr key={produto.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Package className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{produto.nome}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">
                    R$ {produto.preco.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        produto.quantidade > 10
                          ? 'bg-emerald-50 text-emerald-700'
                          : produto.quantidade > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {produto.quantidade} un.
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeletar(produto.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                    >
                      Remover
                    </button>
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
