-- Created by GitHub Copilot in SSMS - review carefully before executing
SET NOCOUNT ON;

IF DB_ID(N'MERCEARIA_STOCK_DB') IS NULL
BEGIN
    CREATE DATABASE [MERCEARIA_STOCK_DB]
    ON PRIMARY
    (
        NAME = N'MERCEARIA_STOCK_DB',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\MERCEARIA_STOCK_DB.mdf',
        SIZE = 128MB,
        FILEGROWTH = 64MB
    )
    LOG ON
    (
        NAME = N'MERCEARIA_STOCK_DB_log',
        FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\MERCEARIA_STOCK_DB_log.ldf',
        SIZE = 64MB,
        FILEGROWTH = 32MB
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'utilizadores'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[utilizadores] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL,
        username NVARCHAR(50) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        perfil NVARCHAR(20) NOT NULL CONSTRAINT DF_utilizadores_perfil DEFAULT N'VENDEDOR',
        telefone NVARCHAR(20) NULL,
        estado NVARCHAR(20) NOT NULL CONSTRAINT DF_utilizadores_estado DEFAULT N'ACTIVO',
        dataCadastro DATETIME2 NOT NULL CONSTRAINT DF_utilizadores_dataCadastro DEFAULT SYSUTCDATETIME(),
        dataActualizacao DATETIME2 NULL,
        CONSTRAINT CK_utilizadores_perfil CHECK (perfil IN (N'ADMIN', N'VENDEDOR')),
        CONSTRAINT CK_utilizadores_estado CHECK (estado IN (N'ACTIVO', N'INACTIVO'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'categorias'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[categorias] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nome NVARCHAR(100) NOT NULL UNIQUE,
        descricao NVARCHAR(MAX) NULL,
        estado NVARCHAR(20) NOT NULL CONSTRAINT DF_categorias_estado DEFAULT N'ACTIVO',
        dataCadastro DATETIME2 NOT NULL CONSTRAINT DF_categorias_dataCadastro DEFAULT SYSUTCDATETIME(),
        dataActualizacao DATETIME2 NULL,
        CONSTRAINT CK_categorias_estado CHECK (estado IN (N'ACTIVO', N'INACTIVO'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'produtos'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[produtos] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo NVARCHAR(50) NOT NULL UNIQUE,
        nome NVARCHAR(200) NOT NULL,
        descricao NVARCHAR(MAX) NULL,
        categoriaId INT NULL,
        marca NVARCHAR(100) NULL,
        unidade NVARCHAR(20) NOT NULL CONSTRAINT DF_produtos_unidade DEFAULT N'Unidade',
        precoCompra DECIMAL(10,2) NOT NULL,
        precoVenda DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL CONSTRAINT DF_produtos_stock DEFAULT 0,
        stockMinimo INT NOT NULL CONSTRAINT DF_produtos_stockMinimo DEFAULT 5,
        dataValidade DATE NULL,
        estado NVARCHAR(20) NOT NULL CONSTRAINT DF_produtos_estado DEFAULT N'ACTIVO',
        dataCadastro DATETIME2 NOT NULL CONSTRAINT DF_produtos_dataCadastro DEFAULT SYSUTCDATETIME(),
        dataActualizacao DATETIME2 NULL,
        CONSTRAINT FK_produtos_categorias FOREIGN KEY (categoriaId)
            REFERENCES [MERCEARIA_STOCK_DB].[dbo].[categorias](id)
            ON DELETE SET NULL,
        CONSTRAINT CK_produtos_estado CHECK (estado IN (N'ACTIVO', N'INACTIVO'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'entradas'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[entradas] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        produtoId INT NOT NULL,
        quantidade INT NOT NULL,
        precoUnitario DECIMAL(10,2) NULL,
        total DECIMAL(10,2) NULL,
        dataEntrada DATETIME2 NOT NULL CONSTRAINT DF_entradas_dataEntrada DEFAULT SYSUTCDATETIME(),
        documento NVARCHAR(50) NULL,
        observacoes NVARCHAR(MAX) NULL,
        utilizadorId INT NULL,
        CONSTRAINT FK_entradas_produtos FOREIGN KEY (produtoId)
            REFERENCES [MERCEARIA_STOCK_DB].[dbo].[produtos](id)
            ON DELETE RESTRICT,
        CONSTRAINT FK_entradas_utilizadores FOREIGN KEY (utilizadorId)
            REFERENCES [MERCEARIA_STOCK_DB].[dbo].[utilizadores](id)
            ON DELETE SET NULL
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'vendas'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[vendas] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        utilizadorId INT NOT NULL,
        dataVenda DATETIME2 NOT NULL CONSTRAINT DF_vendas_dataVenda DEFAULT SYSUTCDATETIME(),
        totalVenda DECIMAL(10,2) NOT NULL CONSTRAINT DF_vendas_totalVenda DEFAULT 0,
        desconto DECIMAL(10,2) NULL CONSTRAINT DF_vendas_desconto DEFAULT 0,
        totalFinal DECIMAL(10,2) NOT NULL CONSTRAINT DF_vendas_totalFinal DEFAULT 0,
        metodoPagamento NVARCHAR(50) NULL,
        observacoes NVARCHAR(MAX) NULL,
        estado NVARCHAR(20) NOT NULL CONSTRAINT DF_vendas_estado DEFAULT N'COMPLETA',
        CONSTRAINT FK_vendas_utilizadores FOREIGN KEY (utilizadorId)
            REFERENCES [MERCEARIA_STOCK_DB].[dbo].[utilizadores](id)
            ON DELETE RESTRICT,
        CONSTRAINT CK_vendas_estado CHECK (estado IN (N'COMPLETA', N'CANCELADA', N'PENDENTE'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'itensVenda'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[itensVenda] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        vendaId INT NOT NULL,
        produtoId INT NOT NULL,
        quantidade INT NOT NULL,
        precoUnitario DECIMAL(10,2) NOT NULL,
        desconto DECIMAL(10,2) NULL CONSTRAINT DF_itensVenda_desconto DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        CONSTRAINT FK_itensVenda_vendas FOREIGN KEY (vendaId)
            REFERENCES [MERCEARIA_STOCK_DB].[dbo].[vendas](id)
            ON DELETE CASCADE,
        CONSTRAINT FK_itensVenda_produtos FOREIGN KEY (produtoId)
            REFERENCES [MERCEARIA_STOCK_DB].[dbo].[produtos](id)
            ON DELETE RESTRICT
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'historico'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[historico] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        utilizador NVARCHAR(100) NOT NULL,
        acao NVARCHAR(100) NOT NULL,
        descricao NVARCHAR(MAX) NULL,
        dataOperacao DATETIME2 NOT NULL CONSTRAINT DF_historico_dataOperacao DEFAULT SYSUTCDATETIME(),
        enderecoIP NVARCHAR(45) NULL
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.tables AS t
    INNER JOIN [MERCEARIA_STOCK_DB].sys.schemas AS s
        ON s.schema_id = t.schema_id
    WHERE t.name = N'configuracoes'
      AND s.name = N'dbo'
)
BEGIN
    CREATE TABLE [MERCEARIA_STOCK_DB].[dbo].[configuracoes] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        chave NVARCHAR(100) NOT NULL UNIQUE,
        valor NVARCHAR(MAX) NULL,
        tipo NVARCHAR(20) NOT NULL CONSTRAINT DF_configuracoes_tipo DEFAULT N'STRING',
        descricao NVARCHAR(MAX) NULL,
        dataCadastro DATETIME2 NOT NULL CONSTRAINT DF_configuracoes_dataCadastro DEFAULT SYSUTCDATETIME(),
        dataActualizacao DATETIME2 NULL,
        CONSTRAINT CK_configuracoes_tipo CHECK (tipo IN (N'STRING', N'INT', N'BOOLEAN', N'DECIMAL'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_utilizadores_username'
)
BEGIN
    CREATE INDEX IX_utilizadores_username ON [MERCEARIA_STOCK_DB].[dbo].[utilizadores](username);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_categorias_nome'
)
BEGIN
    CREATE INDEX IX_categorias_nome ON [MERCEARIA_STOCK_DB].[dbo].[categorias](nome);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_produtos_codigo'
)
BEGIN
    CREATE INDEX IX_produtos_codigo ON [MERCEARIA_STOCK_DB].[dbo].[produtos](codigo);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_produtos_stock'
)
BEGIN
    CREATE INDEX IX_produtos_stock ON [MERCEARIA_STOCK_DB].[dbo].[produtos](stock);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_entradas_produtoId'
)
BEGIN
    CREATE INDEX IX_entradas_produtoId ON [MERCEARIA_STOCK_DB].[dbo].[entradas](produtoId);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_vendas_dataVenda'
)
BEGIN
    CREATE INDEX IX_vendas_dataVenda ON [MERCEARIA_STOCK_DB].[dbo].[vendas](dataVenda);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].sys.indexes
    WHERE name = N'IX_itensVenda_vendaId'
)
BEGIN
    CREATE INDEX IX_itensVenda_vendaId ON [MERCEARIA_STOCK_DB].[dbo].[itensVenda](vendaId);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[utilizadores]
    WHERE username = N'admin'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[utilizadores] (nome, username, password, perfil, estado)
    VALUES (N'Administrador', N'admin', N'admin123', N'ADMIN', N'ACTIVO');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[categorias]
    WHERE nome = N'Alimentos'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[categorias] (nome, descricao, estado)
    VALUES (N'Alimentos', N'Produtos alimentares', N'ACTIVO');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[categorias]
    WHERE nome = N'Bebidas'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[categorias] (nome, descricao, estado)
    VALUES (N'Bebidas', N'Bebidas em geral', N'ACTIVO');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[categorias]
    WHERE nome = N'Limpeza'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[categorias] (nome, descricao, estado)
    VALUES (N'Limpeza', N'Produtos de limpeza', N'ACTIVO');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[categorias]
    WHERE nome = N'Higiene'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[categorias] (nome, descricao, estado)
    VALUES (N'Higiene', N'Produtos de higiene pessoal', N'ACTIVO');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[categorias]
    WHERE nome = N'Outros'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[categorias] (nome, descricao, estado)
    VALUES (N'Outros', N'Outros produtos', N'ACTIVO');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[configuracoes]
    WHERE chave = N'DIAS_AVISO_VALIDADE'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[configuracoes] (chave, valor, tipo, descricao)
    VALUES
        (N'DIAS_AVISO_VALIDADE', N'15', N'INT', N'Dias de antecedência para avisar sobre produtos próximos do vencimento'),
        (N'MOEDA', N'AOA', N'STRING', N'Moeda utilizada no sistema'),
        (N'NOME_EMPRESA', N'Mercearia', N'STRING', N'Nome da empresa'),
        (N'TELEFONE', N'', N'STRING', N'Telefone de contacto'),
        (N'EMAIL', N'', N'STRING', N'Email de contacto'),
        (N'ENDERECO', N'', N'STRING', N'Endereço da empresa'),
        (N'MARGEM_LUCRO_PADRAO', N'30', N'INT', N'Margem de lucro padrão (%)'),
        (N'PERMITE_STOCK_NEGATIVO', N'false', N'BOOLEAN', N'Permite vender com stock negativo'),
        (N'IMPOSTO_VENDAS', N'0', N'DECIMAL', N'Percentual de imposto sobre vendas');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[produtos]
    WHERE codigo = N'P001'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[produtos] (
        codigo, nome, descricao, categoriaId, marca, unidade, precoCompra, precoVenda, stock, stockMinimo, estado
    )
    VALUES (
        N'P001', N'Arroz 1kg', N'Arroz de boa qualidade',
        (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[categorias] WHERE nome = N'Alimentos'),
        N'Boa Mesa', N'Kg', 500.00, 650.00, 0, 10, N'ACTIVO'
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[produtos]
    WHERE codigo = N'P002'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[produtos] (
        codigo, nome, descricao, categoriaId, marca, unidade, precoCompra, precoVenda, stock, stockMinimo, estado
    )
    VALUES (
        N'P002', N'Água 1.5L', N'Água mineral',
        (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[categorias] WHERE nome = N'Bebidas'),
        N'Cristal', N'Unidade', 120.00, 180.00, 0, 10, N'ACTIVO'
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[produtos]
    WHERE codigo = N'P003'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[produtos] (
        codigo, nome, descricao, categoriaId, marca, unidade, precoCompra, precoVenda, stock, stockMinimo, estado
    )
    VALUES (
        N'P003', N'Sabão em pó', N'Sabão para roupa',
        (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[categorias] WHERE nome = N'Limpeza'),
        N'Brilhante', N'Kg', 350.00, 480.00, 0, 8, N'ACTIVO'
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[produtos]
    WHERE codigo = N'P004'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[produtos] (
        codigo, nome, descricao, categoriaId, marca, unidade, precoCompra, precoVenda, stock, stockMinimo, estado
    )
    VALUES (
        N'P004', N'Pasta de dentes', N'Pasta de dentes 100ml',
        (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[categorias] WHERE nome = N'Higiene'),
        N'Clean', N'Unidade', 250.00, 340.00, 0, 6, N'ACTIVO'
    );
END
GO

CREATE OR ALTER TRIGGER [MERCEARIA_STOCK_DB].[dbo].[trg_entradas_stock]
ON [MERCEARIA_STOCK_DB].[dbo].[entradas]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @deltas TABLE (produtoId INT, delta INT);

    INSERT INTO @deltas (produtoId, delta)
    SELECT produtoId, SUM(quantidade)
    FROM inserted
    GROUP BY produtoId;

    INSERT INTO @deltas (produtoId, delta)
    SELECT produtoId, -SUM(quantidade)
    FROM deleted
    GROUP BY produtoId;

    UPDATE p
    SET stock = p.stock + d.delta
    FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] AS p
    INNER JOIN (
        SELECT produtoId, SUM(delta) AS delta
        FROM @deltas
        GROUP BY produtoId
    ) AS d
        ON p.id = d.produtoId;
END
GO

CREATE OR ALTER TRIGGER [MERCEARIA_STOCK_DB].[dbo].[trg_itensVenda_stock]
ON [MERCEARIA_STOCK_DB].[dbo].[itensVenda]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @deltas TABLE (produtoId INT, delta INT);

    INSERT INTO @deltas (produtoId, delta)
    SELECT produtoId, -SUM(quantidade)
    FROM inserted
    GROUP BY produtoId;

    INSERT INTO @deltas (produtoId, delta)
    SELECT produtoId, SUM(quantidade)
    FROM deleted
    GROUP BY produtoId;

    UPDATE p
    SET stock = p.stock + d.delta
    FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] AS p
    INNER JOIN (
        SELECT produtoId, SUM(delta) AS delta
        FROM @deltas
        GROUP BY produtoId
    ) AS d
        ON p.id = d.produtoId;
END
GO

DECLARE @adminId INT = (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[utilizadores] WHERE username = N'admin');
DECLARE @arrozId INT = (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] WHERE codigo = N'P001');
DECLARE @aguaId INT = (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] WHERE codigo = N'P002');
DECLARE @sabaoId INT = (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] WHERE codigo = N'P003');
DECLARE @pastaId INT = (SELECT id FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] WHERE codigo = N'P004');

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[entradas]
    WHERE documento = N'ENTRADA-INICIAL' AND produtoId = @arrozId
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[entradas] (
        produtoId, quantidade, precoUnitario, total, documento, observacoes, utilizadorId
    )
    VALUES (
        @arrozId, 20, 500.00, 10000.00, N'ENTRADA-INICIAL', N'Entrada inicial de stock', @adminId
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[entradas]
    WHERE documento = N'ENTRADA-INICIAL' AND produtoId = @aguaId
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[entradas] (
        produtoId, quantidade, precoUnitario, total, documento, observacoes, utilizadorId
    )
    VALUES (
        @aguaId, 25, 120.00, 3000.00, N'ENTRADA-INICIAL', N'Entrada inicial de stock', @adminId
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[entradas]
    WHERE documento = N'ENTRADA-INICIAL' AND produtoId = @sabaoId
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[entradas] (
        produtoId, quantidade, precoUnitario, total, documento, observacoes, utilizadorId
    )
    VALUES (
        @sabaoId, 15, 350.00, 5250.00, N'ENTRADA-INICIAL', N'Entrada inicial de stock', @adminId
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[entradas]
    WHERE documento = N'ENTRADA-INICIAL' AND produtoId = @pastaId
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[entradas] (
        produtoId, quantidade, precoUnitario, total, documento, observacoes, utilizadorId
    )
    VALUES (
        @pastaId, 12, 250.00, 3000.00, N'ENTRADA-INICIAL', N'Entrada inicial de stock', @adminId
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM [MERCEARIA_STOCK_DB].[dbo].[vendas]
    WHERE observacoes = N'Venda de exemplo'
)
BEGIN
    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[vendas] (
        utilizadorId, totalVenda, desconto, totalFinal, metodoPagamento, observacoes, estado
    )
    VALUES (
        @adminId, 1300.00, 0.00, 1300.00, N'Numerário', N'Venda de exemplo', N'COMPLETA'
    );

    DECLARE @vendaId INT = SCOPE_IDENTITY();

    INSERT INTO [MERCEARIA_STOCK_DB].[dbo].[itensVenda] (
        vendaId, produtoId, quantidade, precoUnitario, desconto, total
    )
    VALUES (
        @vendaId, @arrozId, 2, 650.00, 0.00, 1300.00
    );
END
GO

CREATE OR ALTER VIEW [MERCEARIA_STOCK_DB].[dbo].[vw_resumo_stock] AS
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
        WHEN p.stock <= 0 THEN N'SEM_STOCK'
        WHEN p.stock <= p.stockMinimo THEN N'CRITICO'
        WHEN p.stock <= (p.stockMinimo * 2) THEN N'BAIXO'
        ELSE N'NORMAL'
    END AS estadoStock,
    CASE
        WHEN p.dataValidade IS NULL THEN N'SEM_VALIDADE'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS date), CAST(p.dataValidade AS date)) < 0 THEN N'EXPIRADO'
        WHEN DATEDIFF(DAY, CAST(GETDATE() AS date), CAST(p.dataValidade AS date)) < 15 THEN N'PROXIMO_VENCER'
        ELSE N'VALIDO'
    END AS estadoValidade,
    p.dataValidade,
    p.estado
FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] AS p
LEFT JOIN [MERCEARIA_STOCK_DB].[dbo].[categorias] AS c
    ON p.categoriaId = c.id
WHERE p.estado = N'ACTIVO';
GO

CREATE OR ALTER VIEW [MERCEARIA_STOCK_DB].[dbo].[vw_produtos_criticos] AS
SELECT
    p.id,
    p.codigo,
    p.nome,
    c.nome AS categoria,
    p.stock,
    p.stockMinimo,
    CASE
        WHEN p.stock <= 0 THEN N'SEM_STOCK'
        WHEN p.stock <= p.stockMinimo THEN N'CRITICO'
        ELSE N'BAIXO'
    END AS statusCriticidade
FROM [MERCEARIA_STOCK_DB].[dbo].[produtos] AS p
LEFT JOIN [MERCEARIA_STOCK_DB].[dbo].[categorias] AS c
    ON p.categoriaId = c.id
WHERE p.estado = N'ACTIVO'
  AND p.stock <= (p.stockMinimo * 2);
GO

SELECT
    id,
    codigo,
    nome,
    stock,
    stockMinimo,
    estado
FROM [MERCEARIA_STOCK_DB].[dbo].[produtos]
ORDER BY id;
GO

SELECT
    id,
    produtoId,
    quantidade,
    documento,
    observacoes
FROM [MERCEARIA_STOCK_DB].[dbo].[entradas]
ORDER BY id;
GO

SELECT
    id,
    observacoes,
    totalFinal,
    estado
FROM [MERCEARIA_STOCK_DB].[dbo].[vendas]
ORDER BY id;
GO

SELECT
    id,
    vendaId,
    produtoId,
    quantidade,
    total
FROM [MERCEARIA_STOCK_DB].[dbo].[itensVenda]
ORDER BY id;
GO

SELECT
    id,
    codigo,
    nome,
    categoria,
    stock,
    stockMinimo,
    estadoStock
FROM [MERCEARIA_STOCK_DB].[dbo].[vw_resumo_stock]
ORDER BY nome;
GO