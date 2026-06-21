import axios from 'axios'

// Aqui a gente cria a instância do axios que vai conversar com o nosso backend
// lá no FastAPI. Se a porta não for 8000, é só trocar aqui, beleza?
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Estoque ──────────────────────────────────────────────────────────────────

export const getProdutos = () => api.get('/api/estoque/')
export const getProduto = (id) => api.get(`/api/estoque/${id}`)
export const criarProduto = (data) => api.post('/api/estoque/', data)
export const atualizarProduto = (id, data) => api.patch(`/api/estoque/${id}`, data)
export const deletarProduto = (id) => api.delete(`/api/estoque/${id}`)

// ─── Fiado (Clientes + Movimentações) ────────────────────────────────────────

export const getClientes = () => api.get('/api/fiado/clientes')
export const getCliente = (id) => api.get(`/api/fiado/clientes/${id}`)
export const criarCliente = (data) => api.post('/api/fiado/clientes', data)
export const atualizarCliente = (id, data) => api.patch(`/api/fiado/clientes/${id}`, data)
export const deletarCliente = (id) => api.delete(`/api/fiado/clientes/${id}`)
export const getMovimentacoes = (clienteId) => api.get(`/api/fiado/movimentacoes/${clienteId}`)
export const registrarFiado = (data) => api.post('/api/fiado/movimentacoes', data)

export default api
