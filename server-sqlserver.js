const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const dbHost = process.env.DB_HOST || 'localhost';
const dbInstance = process.env.DB_INSTANCE;
const dbServer = dbInstance ? `${dbHost}\\${dbInstance}` : dbHost;
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433;

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: dbServer,
  port: dbPort,
  database: process.env.DB_NAME || 'MERCEARIA_STOCK_DB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Conectado ao SQL Server:', dbConfig.server);
    return pool;
  })
  .catch(err => {
    console.error('Erro ao conectar ao SQL Server:', err.message);
    process.exit(1);
  });

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

const formatUser = user => ({
  id: user.id,
  nome: user.nome,
  username: user.username,
  perfil: user.perfil,
  telefone: user.telefone
});

app.get('/', (req, res) => {
  res.json({ ok: true, mensagem: 'Servidor SQL Server ativo' });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, mensagem: 'Username e password são obrigatórios' });
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input('username', sql.NVarChar(50), username);

    const result = await request.query(
      'SELECT * FROM dbo.utilizadores WHERE username = @username'
    );
    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({ ok: false, mensagem: 'Utilizador inexistente' });
    }

    if (user.estado !== 'ACTIVO') {
      return res.status(401).json({ ok: false, mensagem: 'Utilizador desactivado' });
    }

    const senhaArmazenada = user.password || '';
    let senhaCorreta = false;

    if (senhaArmazenada.startsWith('$2a$') || senhaArmazenada.startsWith('$2b$') || senhaArmazenada.startsWith('$2y$')) {
      senhaCorreta = await bcrypt.compare(password, senhaArmazenada);
    } else {
      senhaCorreta = senhaArmazenada === password;
    }

    if (!senhaCorreta) {
      return res.status(401).json({ ok: false, mensagem: 'Palavra-passe incorrecta' });
    }

    if (!senhaArmazenada.startsWith('$2a$') && !senhaArmazenada.startsWith('$2b$') && !senhaArmazenada.startsWith('$2y$')) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const updateRequest = pool.request();
      updateRequest.input('password', sql.NVarChar(255), hashedPassword);
      updateRequest.input('username', sql.NVarChar(50), user.username);
      await updateRequest.query(
        'UPDATE dbo.utilizadores SET password = @password WHERE username = @username'
      );
    }

    await pool.request()
      .input('utilizador', sql.NVarChar(50), user.username)
      .input('acao', sql.NVarChar(50), 'LOGIN')
      .input('descricao', sql.NVarChar(255), 'Início de sessão')
      .query(
        `INSERT INTO dbo.historico (utilizador, acao, descricao) VALUES (@utilizador, @acao, @descricao)`
      );

    const token = jwt.sign(
      { id: user.id, username: user.username, perfil: user.perfil },
      process.env.JWT_SECRET || 'seu_secret_key',
      { expiresIn: '24h' }
    );

    res.json({ ok: true, token, utilizador: formatUser(user) });
  } catch (err) {
    res.status(500).json({ ok: false, mensagem: 'Erro ao fazer login', erro: err.message });
  }
});

app.get('/api/produtos', verificarToken, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      "SELECT * FROM dbo.produtos WHERE estado = N'ACTIVO'"
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.get('/api/produtos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query('SELECT * FROM dbo.produtos WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ ok: false, mensagem: 'Produto não encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.post('/api/produtos', verificarToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ ok: false, mensagem: 'Permissão negada' });
    }

    const {
      codigo, nome, descricao, categoriaId, marca, unidade,
      precoCompra, precoVenda, stock, stockMinimo, dataValidade, estado
    } = req.body;

    const pool = await poolPromise;
    const request = pool.request();
    request.input('codigo', sql.NVarChar(50), codigo);
    request.input('nome', sql.NVarChar(200), nome);
    request.input('descricao', sql.NVarChar(sql.MAX), descricao);
    request.input('categoriaId', sql.Int, categoriaId || null);
    request.input('marca', sql.NVarChar(100), marca);
    request.input('unidade', sql.NVarChar(20), unidade || 'Unidade');
    request.input('precoCompra', sql.Decimal(10, 2), precoCompra);
    request.input('precoVenda', sql.Decimal(10, 2), precoVenda);
    request.input('stock', sql.Int, stock ?? 0);
    request.input('stockMinimo', sql.Int, stockMinimo ?? 5);
    request.input('dataValidade', sql.Date, dataValidade || null);
    request.input('estado', sql.NVarChar(20), estado || 'ACTIVO');

    const insertResult = await request.query(
      `INSERT INTO dbo.produtos
       (codigo, nome, descricao, categoriaId, marca, unidade,
        precoCompra, precoVenda, stock, stockMinimo, dataValidade, estado)
       OUTPUT INSERTED.id
       VALUES (@codigo, @nome, @descricao, @categoriaId, @marca, @unidade,
               @precoCompra, @precoVenda, @stock, @stockMinimo, @dataValidade, @estado)`
    );

    const insertedId = insertResult.recordset[0]?.id;

    await pool.request()
      .input('utilizador', sql.NVarChar(50), req.user.username)
      .input('acao', sql.NVarChar(50), 'CADASTRO_PRODUTO')
      .input('descricao', sql.NVarChar(255), `Cadastro do produto ${nome}`)
      .query(
        `INSERT INTO dbo.historico (utilizador, acao, descricao)
         VALUES (@utilizador, @acao, @descricao)`
      );

    res.status(201).json({ ok: true, id: insertedId });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor SQL Server rodando na porta ${PORT}`);
});
