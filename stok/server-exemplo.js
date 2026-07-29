/**
 * EXEMPLO DE SERVIDOR BACKEND - Node.js + Express + MySQL
 * 
 * Este arquivo serve como exemplo para conectar a aplicação front-end
 * com o banco de dados MySQL.
 * 
 * INSTALAÇÃO:
 * npm install express mysql2 cors dotenv bcrypt jsonwebtoken
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// ============================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ============================================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'MERCEARIA_STOCK_DB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================================================

const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ ok: false, mensagem: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, mensagem: 'Token inválido' });
  }
};

// ============================================================================
// ROTAS: AUTENTICAÇÃO
// ============================================================================

/**
 * POST /api/auth/login
 * Autentica um utilizador
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        ok: false, 
        mensagem: 'Username e password são obrigatórios' 
      });
    }
    
    const connection = await pool.getConnection();
    const [utilizadores] = await connection.query(
      'SELECT * FROM utilizadores WHERE username = ?',
      [username]
    );
    
    if (utilizadores.length === 0) {
      connection.release();
      return res.status(401).json({ 
        ok: false, 
        mensagem: 'Utilizador inexistente' 
      });
    }
    
    const user = utilizadores[0];
    
    if (user.estado !== 'ACTIVO') {
      connection.release();
      return res.status(401).json({ 
        ok: false, 
        mensagem: 'Utilizador desactivado' 
      });
    }
    
    // Comparar senhas (recomendado usar bcrypt em produção)
    if (user.password !== password) {
      connection.release();
      return res.status(401).json({ 
        ok: false, 
        mensagem: 'Palavra-passe incorrecta' 
      });
    }
    
    // Registar login no histórico
    await connection.query(
      `INSERT INTO historico (utilizador, acao, descricao) 
       VALUES (?, 'LOGIN', 'Início de sessão')`,
      [user.username]
    );
    
    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, perfil: user.perfil },
      process.env.JWT_SECRET || 'seu_secret_key',
      { expiresIn: '24h' }
    );
    
    connection.release();
    
    res.json({
      ok: true,
      token,
      utilizador: {
        id: user.id,
        nome: user.nome,
        username: user.username,
        perfil: user.perfil,
        telefone: user.telefone
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, mensagem: 'Erro ao fazer login', erro: err.message });
  }
});

// ============================================================================
// ROTAS: PRODUTOS
// ============================================================================

/**
 * GET /api/produtos
 * Lista todos os produtos
 */
app.get('/api/produtos', verificarToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [produtos] = await connection.query('SELECT * FROM produtos WHERE estado = "ACTIVO"');
    connection.release();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * GET /api/produtos/:id
 * Obter um produto específico
 */
app.get('/api/produtos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [produtos] = await connection.query('SELECT * FROM produtos WHERE id = ?', [id]);
    connection.release();
    
    if (produtos.length === 0) {
      return res.status(404).json({ ok: false, mensagem: 'Produto não encontrado' });
    }
    
    res.json(produtos[0]);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * POST /api/produtos
 * Criar novo produto (apenas ADMIN)
 */
app.post('/api/produtos', verificarToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ ok: false, mensagem: 'Permissão negada' });
    }
    
    const {
      codigo, nome, descricao, categoriaId, marca, unidade,
      precoCompra, precoVenda, stock, stockMinimo, dataValidade, estado
    } = req.body;
    
    const connection = await pool.getConnection();
    
    const [result] = await connection.query(
      `INSERT INTO produtos 
       (codigo, nome, descricao, categoriaId, marca, unidade, precoCompra, 
        precoVenda, stock, stockMinimo, dataValidade, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nome, descricao, categoriaId, marca, unidade, precoCompra,
       precoVenda, stock, stockMinimo, dataValidade, estado || 'ACTIVO']
    );
    
    // Registar no histórico
    await connection.query(
      `INSERT INTO historico (utilizador, acao, descricao) 
       VALUES (?, 'CADASTRO_PRODUTO', ?)`,
      [req.user.username, `Cadastro do produto ${nome}`]
    );
    
    connection.release();
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * PUT /api/produtos/:id
 * Actualizar produto (apenas ADMIN)
 */
app.put('/api/produtos/:id', verificarToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ ok: false, mensagem: 'Permissão negada' });
    }
    
    const { id } = req.params;
    const {
      codigo, nome, descricao, categoriaId, marca, unidade,
      precoCompra, precoVenda, stock, stockMinimo, dataValidade, estado
    } = req.body;
    
    const connection = await pool.getConnection();
    
    await connection.query(
      `UPDATE produtos SET 
       codigo = ?, nome = ?, descricao = ?, categoriaId = ?, marca = ?, unidade = ?,
       precoCompra = ?, precoVenda = ?, stock = ?, stockMinimo = ?, dataValidade = ?, estado = ?
       WHERE id = ?`,
      [codigo, nome, descricao, categoriaId, marca, unidade, precoCompra,
       precoVenda, stock, stockMinimo, dataValidade, estado, id]
    );
    
    // Registar no histórico
    await connection.query(
      `INSERT INTO historico (utilizador, acao, descricao) 
       VALUES (?, 'EDICAO_PRODUTO', ?)`,
      [req.user.username, `Edição do produto ${nome}`]
    );
    
    connection.release();
    res.json({ ok: true, mensagem: 'Produto actualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * DELETE /api/produtos/:id
 * Eliminar produto (apenas ADMIN)
 */
app.delete('/api/produtos/:id', verificarToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ ok: false, mensagem: 'Permissão negada' });
    }
    
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    const [produtos] = await connection.query('SELECT nome FROM produtos WHERE id = ?', [id]);
    
    if (produtos.length === 0) {
      connection.release();
      return res.status(404).json({ ok: false, mensagem: 'Produto não encontrado' });
    }
    
    await connection.query('DELETE FROM produtos WHERE id = ?', [id]);
    
    // Registar no histórico
    await connection.query(
      `INSERT INTO historico (utilizador, acao, descricao) 
       VALUES (?, 'ELIMINACAO_PRODUTO', ?)`,
      [req.user.username, `Eliminação do produto ${produtos[0].nome}`]
    );
    
    connection.release();
    res.json({ ok: true, mensagem: 'Produto eliminado com sucesso' });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ============================================================================
// ROTAS: VENDAS
// ============================================================================

/**
 * GET /api/vendas
 * Listar todas as vendas
 */
app.get('/api/vendas', verificarToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [vendas] = await connection.query(`
      SELECT v.*, u.nome as nomeVendedor
      FROM vendas v
      JOIN utilizadores u ON v.utilizadorId = u.id
      ORDER BY v.dataVenda DESC
    `);
    connection.release();
    res.json(vendas);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * POST /api/vendas
 * Criar nova venda (apenas VENDEDOR)
 */
app.post('/api/vendas', verificarToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'VENDEDOR' && req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ ok: false, mensagem: 'Permissão negada' });
    }
    
    const { itens, totalVenda, desconto, metodoPagamento, observacoes } = req.body;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const totalFinal = totalVenda - (desconto || 0);
      
      // Criar venda
      const [vendaResult] = await connection.query(
        `INSERT INTO vendas (utilizadorId, totalVenda, desconto, totalFinal, metodoPagamento, observacoes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, totalVenda, desconto || 0, totalFinal, metodoPagamento, observacoes]
      );
      
      const vendaId = vendaResult.insertId;
      
      // Adicionar itens da venda
      for (const item of itens) {
        await connection.query(
          `INSERT INTO itensVenda (vendaId, produtoId, quantidade, precoUnitario, total)
           VALUES (?, ?, ?, ?, ?)`,
          [vendaId, item.produtoId, item.quantidade, item.precoUnitario, item.total]
        );
        
        // Atualizar stock
        await connection.query(
          `UPDATE produtos SET stock = stock - ? WHERE id = ?`,
          [item.quantidade, item.produtoId]
        );
      }
      
      // Registar no histórico
      await connection.query(
        `INSERT INTO historico (utilizador, acao, descricao)
         VALUES (?, 'VENDA', ?)`,
        [req.user.username, `Venda #${vendaId} - Total: ${totalFinal}`]
      );
      
      await connection.commit();
      connection.release();
      
      res.status(201).json({ ok: true, vendaId, totalFinal });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ============================================================================
// ROTAS: RELATÓRIOS
// ============================================================================

/**
 * GET /api/relatorios/resumo-stock
 * Resumo de stock
 */
app.get('/api/relatorios/resumo-stock', verificarToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [dados] = await connection.query('SELECT * FROM vw_resumo_stock');
    connection.release();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * GET /api/relatorios/vendas-por-dia
 * Vendas por dia
 */
app.get('/api/relatorios/vendas-por-dia', verificarToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [dados] = await connection.query('SELECT * FROM vw_vendas_por_dia LIMIT 30');
    connection.release();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * GET /api/relatorios/produtos-criticos
 * Produtos com stock crítico
 */
app.get('/api/relatorios/produtos-criticos', verificarToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [dados] = await connection.query('SELECT * FROM vw_produtos_criticos');
    connection.release();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

/**
 * GET /api/relatorios/performance-vendedores
 * Performance dos vendedores
 */
app.get('/api/relatorios/performance-vendedores', verificarToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ ok: false, mensagem: 'Permissão negada' });
    }
    
    const connection = await pool.getConnection();
    const [dados] = await connection.query('SELECT * FROM vw_performance_vendedores');
    connection.release();
    res.json(dados);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
