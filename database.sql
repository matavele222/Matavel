-- ============================================================================
-- DATABASE: MERCEARIA_STOCK_DB
-- Sistema de Gestão e Controlo de Stock
-- ============================================================================

-- Criar a base de dados
CREATE DATABASE IF NOT EXISTS MERCEARIA_STOCK_DB;
USE MERCEARIA_STOCK_DB;

-- ============================================================================
-- TABELA: utilizadores
-- Descrição: Armazena os utilizadores do sistema (Admin, Vendedor)
-- ============================================================================
CREATE TABLE IF NOT EXISTS utilizadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  perfil ENUM('ADMIN', 'VENDEDOR') NOT NULL DEFAULT 'VENDEDOR',
  telefone VARCHAR(20),
  estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dataActualizacao DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_username (username),
  INDEX idx_perfil (perfil),
  INDEX idx_estado (estado),
  INDEX idx_dataCadastro (dataCadastro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: categorias
-- Descrição: Categorias de produtos
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dataActualizacao DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: fornecedores
-- Descrição: Fornecedores de produtos
-- ============================================================================
CREATE TABLE IF NOT EXISTS fornecedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  contacto VARCHAR(100),
  telefone VARCHAR(20),
  email VARCHAR(100),
  endereco TEXT,
  cidade VARCHAR(100),
  codigoPostal VARCHAR(20),
  nif VARCHAR(20),
  banco VARCHAR(100),
  iban VARCHAR(34),
  estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dataActualizacao DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_nome (nome),
  INDEX idx_estado (estado),
  INDEX idx_telefone (telefone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: produtos
-- Descrição: Inventário de produtos
-- ============================================================================
CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  categoriaId INT,
  marca VARCHAR(100),
  unidade VARCHAR(20) DEFAULT 'Unidade',
  precoCompra DECIMAL(10, 2) NOT NULL,
  precoVenda DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  stockMinimo INT NOT NULL DEFAULT 5,
  dataValidade DATE,
  estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dataActualizacao DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (categoriaId) REFERENCES categorias(id) ON DELETE SET NULL,
  INDEX idx_codigo (codigo),
  INDEX idx_nome (nome),
  INDEX idx_categoriaId (categoriaId),
  INDEX idx_estado (estado),
  INDEX idx_stock (stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: entradas
-- Descrição: Registro de entradas de produtos no estoque
-- ============================================================================
CREATE TABLE IF NOT EXISTS entradas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produtoId INT NOT NULL,
  fornecedorId INT,
  quantidade INT NOT NULL,
  precoUnitario DECIMAL(10, 2),
  total DECIMAL(10, 2),
  dataEntrada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  documento VARCHAR(50),
  observacoes TEXT,
  utilizadorId INT,
  
  FOREIGN KEY (produtoId) REFERENCES produtos(id) ON DELETE RESTRICT,
  FOREIGN KEY (fornecedorId) REFERENCES fornecedores(id) ON DELETE SET NULL,
  FOREIGN KEY (utilizadorId) REFERENCES utilizadores(id) ON DELETE SET NULL,
  INDEX idx_produtoId (produtoId),
  INDEX idx_fornecedorId (fornecedorId),
  INDEX idx_dataEntrada (dataEntrada),
  INDEX idx_utilizadorId (utilizadorId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: vendas
-- Descrição: Registro de vendas realizadas
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilizadorId INT NOT NULL,
  dataVenda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  totalVenda DECIMAL(10, 2) NOT NULL DEFAULT 0,
  desconto DECIMAL(10, 2) DEFAULT 0,
  totalFinal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  metodoPagamento VARCHAR(50),
  observacoes TEXT,
  estado ENUM('COMPLETA', 'CANCELADA', 'PENDENTE') NOT NULL DEFAULT 'COMPLETA',
  
  FOREIGN KEY (utilizadorId) REFERENCES utilizadores(id) ON DELETE RESTRICT,
  INDEX idx_utilizadorId (utilizadorId),
  INDEX idx_dataVenda (dataVenda),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: itensVenda
-- Descrição: Itens individuais de cada venda
-- ============================================================================
CREATE TABLE IF NOT EXISTS itensVenda (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendaId INT NOT NULL,
  produtoId INT NOT NULL,
  quantidade INT NOT NULL,
  precoUnitario DECIMAL(10, 2) NOT NULL,
  desconto DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  
  FOREIGN KEY (vendaId) REFERENCES vendas(id) ON DELETE CASCADE,
  FOREIGN KEY (produtoId) REFERENCES produtos(id) ON DELETE RESTRICT,
  INDEX idx_vendaId (vendaId),
  INDEX idx_produtoId (produtoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: historico
-- Descrição: Log de todas as operações realizadas no sistema
-- ============================================================================
CREATE TABLE IF NOT EXISTS historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilizador VARCHAR(100) NOT NULL,
  acao VARCHAR(100) NOT NULL,
  descricao TEXT,
  dataOperacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enderecoIP VARCHAR(45),
  
  INDEX idx_utilizador (utilizador),
  INDEX idx_acao (acao),
  INDEX idx_dataOperacao (dataOperacao),
  FULLTEXT idx_descricao (descricao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABELA: configuracoes
-- Descrição: Configurações gerais do sistema
-- ============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  tipo ENUM('STRING', 'INT', 'BOOLEAN', 'DECIMAL') DEFAULT 'STRING',
  descricao TEXT,
  dataCadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dataActualizacao DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_chave (chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir admin padrão (password: admin123)
INSERT INTO utilizadores (nome, username, password, perfil, estado) 
VALUES ('Administrador', 'admin', 'admin123', 'ADMIN', 'ACTIVO');

-- Inserir categorias padrão
INSERT INTO categorias (nome, descricao, estado) VALUES
  ('Alimentos', 'Produtos alimentares', 'ACTIVO'),
  ('Bebidas', 'Bebidas em geral', 'ACTIVO'),
  ('Limpeza', 'Produtos de limpeza', 'ACTIVO'),
  ('Higiene', 'Produtos de higiene pessoal', 'ACTIVO'),
  ('Outros', 'Outros produtos', 'ACTIVO');

-- Inserir configurações padrão
INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES
  ('DIAS_AVISO_VALIDADE', '15', 'INT', 'Dias de antecedência para avisar sobre produtos próximos do vencimento'),
  ('MOEDA', 'AOA', 'STRING', 'Moeda utilizada no sistema'),
  ('NOME_EMPRESA', 'Mercearia', 'STRING', 'Nome da empresa'),
  ('TELEFONE', '', 'STRING', 'Telefone de contacto'),
  ('EMAIL', '', 'STRING', 'Email de contacto'),
  ('ENDERECO', '', 'STRING', 'Endereço da empresa'),
  ('MARGEM_LUCRO_PADRAO', '30', 'INT', 'Margem de lucro padrão (%)'),
  ('PERMITE_STOCK_NEGATIVO', 'false', 'BOOLEAN', 'Permite vender com stock negativo'),
  ('IMPOSTO_VENDAS', '0', 'DECIMAL', 'Percentual de imposto sobre vendas');

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Resumo de Stock
CREATE OR REPLACE VIEW vw_resumo_stock AS
SELECT 
  p.id,
  p.codigo,
  p.nome,
  c.nome AS categoria,
  p.stock,
  p.stockMinimo,
  p.precoVenda,
  (p.stock * p.precoVenda) AS valorStock,
  CASE 
    WHEN p.stock <= 0 THEN 'SEM_STOCK'
    WHEN p.stock <= p.stockMinimo THEN 'CRITICO'
    WHEN p.stock <= (p.stockMinimo * 2) THEN 'BAIXO'
    ELSE 'NORMAL'
  END AS estadoStock,
  CASE 
    WHEN p.dataValidade IS NULL THEN 'SEM_VALIDADE'
    WHEN DATEDIFF(p.dataValidade, CURDATE()) < 0 THEN 'EXPIRADO'
    WHEN DATEDIFF(p.dataValidade, CURDATE()) < 15 THEN 'PROXIMO_VENCER'
    ELSE 'VALIDO'
  END AS estadoValidade,
  p.dataValidade,
  p.estado
FROM produtos p
LEFT JOIN categorias c ON p.categoriaId = c.id
WHERE p.estado = 'ACTIVO';

-- View: Vendas por Dia
CREATE OR REPLACE VIEW vw_vendas_por_dia AS
SELECT 
  DATE(v.dataVenda) AS data,
  COUNT(DISTINCT v.id) AS numeroVendas,
  SUM(v.totalFinal) AS totalVendido,
  COUNT(DISTINCT v.utilizadorId) AS vendedores
FROM vendas v
WHERE v.estado = 'COMPLETA'
GROUP BY DATE(v.dataVenda)
ORDER BY data DESC;

-- View: Produtos Críticos
CREATE OR REPLACE VIEW vw_produtos_criticos AS
SELECT 
  p.id,
  p.codigo,
  p.nome,
  c.nome AS categoria,
  p.stock,
  p.stockMinimo,
  CASE 
    WHEN p.stock <= 0 THEN 'SEM_STOCK'
    WHEN p.stock <= p.stockMinimo THEN 'CRITICO'
    ELSE 'BAIXO'
  END AS statusCriticidade
FROM produtos p
LEFT JOIN categorias c ON p.categoriaId = c.id
WHERE p.estado = 'ACTIVO' AND p.stock <= (p.stockMinimo * 2)
ORDER BY p.stock ASC;

-- View: Performance de Vendedores
CREATE OR REPLACE VIEW vw_performance_vendedores AS
SELECT 
  u.id,
  u.nome,
  u.username,
  COUNT(DISTINCT v.id) AS totalVendas,
  SUM(v.totalFinal) AS totalVendido,
  AVG(v.totalFinal) AS ticketMedio,
  MAX(v.dataVenda) AS ultimaVenda
FROM utilizadores u
LEFT JOIN vendas v ON u.id = v.utilizadorId AND v.estado = 'COMPLETA'
WHERE u.perfil = 'VENDEDOR' AND u.estado = 'ACTIVO'
GROUP BY u.id, u.nome, u.username;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
