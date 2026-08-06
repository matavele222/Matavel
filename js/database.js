const DB_NAME = "MERCEARIA_STOCK_DB";
const DB_VERSION = 1;

const STORE_NAMES = {
  utilizadores: "utilizadores",
  produtos: "produtos",
  categorias: "categorias",
  fornecedores: "fornecedores",
  entradas: "entradas",
  vendas: "vendas",
  itensVenda: "itensVenda",
  historico: "historico",
  configuracoes: "configuracoes"
};

function abrirBaseDados() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => criarTabelas(event.target.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function criarTabelas(db) {
  if (!db.objectStoreNames.contains(STORE_NAMES.utilizadores)) {
    const s = db.createObjectStore(STORE_NAMES.utilizadores, { keyPath: "id", autoIncrement: true });
    s.createIndex("username", "username", { unique: true });
    s.createIndex("perfil", "perfil", { unique: false });
    s.createIndex("estado", "estado", { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.produtos)) {
    const s = db.createObjectStore(STORE_NAMES.produtos, { keyPath: "id", autoIncrement: true });
    s.createIndex("codigo", "codigo", { unique: true });
    s.createIndex("nome", "nome", { unique: false });
    s.createIndex("categoriaId", "categoriaId", { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.categorias)) {
    const s = db.createObjectStore(STORE_NAMES.categorias, { keyPath: "id", autoIncrement: true });
    s.createIndex("nome", "nome", { unique: true });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.fornecedores)) {
    db.createObjectStore(STORE_NAMES.fornecedores, { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.entradas)) {
    db.createObjectStore(STORE_NAMES.entradas, { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.vendas)) {
    const s = db.createObjectStore(STORE_NAMES.vendas, { keyPath: "id", autoIncrement: true });
    s.createIndex("utilizadorId", "utilizadorId", { unique: false });
    s.createIndex("data", "data", { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.itensVenda)) {
    const s = db.createObjectStore(STORE_NAMES.itensVenda, { keyPath: "id", autoIncrement: true });
    s.createIndex("vendaId", "vendaId", { unique: false });
    s.createIndex("produtoId", "produtoId", { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.historico)) {
    db.createObjectStore(STORE_NAMES.historico, { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.configuracoes)) {
    db.createObjectStore(STORE_NAMES.configuracoes, { keyPath: "id", autoIncrement: true });
  }
}

function transaccao(storeName, mode = "readonly") {
  return abrirBaseDados().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function adicionar(storeName, dados) {
  return transaccao(storeName, "readwrite").then((store) => new Promise((resolve, reject) => {
    const req = store.add(dados);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function actualizar(storeName, dados) {
  return transaccao(storeName, "readwrite").then((store) => new Promise((resolve, reject) => {
    const req = store.put(dados);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function eliminar(storeName, id) {
  return transaccao(storeName, "readwrite").then((store) => new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  }));
}

function buscarPorId(storeName, id) {
  return transaccao(storeName).then((store) => new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

function buscarTodos(storeName) {
  return transaccao(storeName).then((store) => new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function buscarPorCampo(storeName, campo, valor) {
  return buscarTodos(storeName).then((items) =>
    items.filter((item) => String(item[campo]) === String(valor))
  );
}

function pesquisar(storeName, campos, termo) {
  return buscarTodos(storeName).then((items) => {
    const q = String(termo || "").toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) =>
      campos.some((c) => String(item[c] || "").toLowerCase().includes(q))
    );
  });
}

function dataHoraActual() {
  const agora = new Date();
  return { data: agora.toLocaleDateString("pt-PT"), hora: agora.toLocaleTimeString("pt-PT") };
}

function registarHistorico(utilizador, operacao, descricao) {
  const { data, hora } = dataHoraActual();
  return adicionar(STORE_NAMES.historico, { utilizador, operacao, descricao, data, hora });
}

async function inicializarDadosDemo() {
  const utilizadores = await buscarTodos(STORE_NAMES.utilizadores);
  if (!utilizadores.some((u) => u.username === "admin")) {
    await adicionar(STORE_NAMES.utilizadores, {
      nome: "Administrador", username: "admin", password: "admin123",
      telefone: "", perfil: "ADMIN", estado: "ACTIVO", dataCadastro: new Date().toISOString()
    });
  }

  const configs = await buscarTodos(STORE_NAMES.configuracoes);
  if (!configs.length) {
    await adicionar(STORE_NAMES.configuracoes, {
      nomeMercearia: "Mercearia Central",
      validadeNormalDias: 30,
      validadeProximaDias: 7
    });
  }

  const categorias = await buscarTodos(STORE_NAMES.categorias);
  if (!categorias.length) await semearCategorias();

  const produtos = await buscarTodos(STORE_NAMES.produtos);
  if (!produtos.length) await semearProdutos();
}

async function semearCategorias() {
  for (const nome of ["Bebidas", "Alimentos", "Higiene", "Limpeza", "Laticínios", "Outros"]) {
    await adicionar(STORE_NAMES.categorias, { nome, estado: "ACTIVO" });
  }
}

async function semearProdutos() {
  const cats = await buscarTodos(STORE_NAMES.categorias);
  const byNome = Object.fromEntries(cats.map((c) => [c.nome, c.id]));
  const lista = [
    ["Arroz 5kg", "Alimentos", 450, 380, 20, 8, "Unidade"],
    ["Arroz 25kg", "Alimentos", 1800, 1500, 10, 10, "Saco"],
    ["Açúcar 1kg", "Alimentos", 100, 80, 30, 15, "Kg"],
    ["Óleo 1L", "Alimentos", 120, 95, 25, 10, "Litro"],
    ["Farinha de Milho", "Alimentos", 90, 70, 18, 10, "Kg"],
    ["Leite UHT", "Laticínios", 110, 85, 12, 6, "Unidade"],
    ["Coca-Cola 2L", "Bebidas", 140, 110, 16, 8, "Unidade"],
    ["Água 1.5L", "Bebidas", 60, 45, 50, 20, "Unidade"],
    ["Sabão", "Limpeza", 75, 55, 20, 10, "Unidade"],
    ["Bolachas", "Outros", 85, 60, 22, 10, "Pacote"]
  ];
  let n = 1;
  const validade = new Date();
  validade.setDate(validade.getDate() + 15);
  for (const [nome, cat, pv, pc, stock, min, unidade] of lista) {
    await adicionar(STORE_NAMES.produtos, {
      codigo: `PRD-${String(n++).padStart(4, "0")}`,
      nome, categoriaId: byNome[cat] || null, marca: "", unidade,
      precoCompra: pc, precoVenda: pv, stock, stockMinimo: min,
      dataValidade: nome === "Leite UHT" ? validade.toISOString().split("T")[0] : "",
      descricao: "", estado: "ACTIVO",
      dataCadastro: new Date().toISOString()
    });
  }
}

function limparStore(storeName) {
  return transaccao(storeName, "readwrite").then((store) => new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  }));
}

async function obterProdutosVendidos() {
  const [itens, produtos] = await Promise.all([
    buscarTodos(STORE_NAMES.itensVenda),
    buscarTodos(STORE_NAMES.produtos)
  ]);
  const map = {};
  for (const it of itens) {
    if (!map[it.produtoId]) map[it.produtoId] = { produtoId: it.produtoId, quantidadeVendida: 0, valorTotal: 0 };
    map[it.produtoId].quantidadeVendida += Number(it.quantidade);
    map[it.produtoId].valorTotal += Number(it.total);
  }
  const prodMap = Object.fromEntries(produtos.map((p) => [p.id, p]));
  return Object.values(map).map((item) => ({
    ...item,
    nome: prodMap[item.produtoId]?.nome || "Produto eliminado",
    stockActual: prodMap[item.produtoId]?.stock ?? 0
  })).sort((a, b) => a.nome.localeCompare(b.nome));
}

async function reiniciarSistemaCompleto(comProdutos = false) {
  const storesLimpar = [
    STORE_NAMES.produtos, STORE_NAMES.categorias, STORE_NAMES.vendas,
    STORE_NAMES.itensVenda, STORE_NAMES.entradas, STORE_NAMES.historico,
    STORE_NAMES.fornecedores, STORE_NAMES.configuracoes
  ];
  for (const store of storesLimpar) await limparStore(store);

  const utilizadores = await buscarTodos(STORE_NAMES.utilizadores);
  for (const u of utilizadores) {
    if (u.perfil === "VENDEDOR") await eliminar(STORE_NAMES.utilizadores, u.id);
  }

  await adicionar(STORE_NAMES.configuracoes, {
    nomeMercearia: "Mercearia Central",
    validadeNormalDias: 30,
    validadeProximaDias: 7
  });

  if (comProdutos) {
    await semearCategorias();
    await semearProdutos();
  }
}

async function reiniciarVendas(produtoIdsRestaurar = []) {
  const itens = await buscarTodos(STORE_NAMES.itensVenda);
  const qtyPorProduto = {};
  for (const it of itens) {
    qtyPorProduto[it.produtoId] = (qtyPorProduto[it.produtoId] || 0) + Number(it.quantidade);
  }

  for (const produtoId of produtoIdsRestaurar) {
    const qty = qtyPorProduto[produtoId];
    if (!qty) continue;
    const prod = await buscarPorId(STORE_NAMES.produtos, produtoId);
    if (prod) {
      await actualizar(STORE_NAMES.produtos, { ...prod, stock: Number(prod.stock) + qty });
    }
  }

  await limparStore(STORE_NAMES.vendas);
  await limparStore(STORE_NAMES.itensVenda);
}

window.DB = {
  DB_NAME, STORE_NAMES, abrirBaseDados, criarTabelas,
  adicionar, actualizar, eliminar, buscarPorId, buscarTodos,
  buscarPorCampo, pesquisar, registarHistorico, inicializarDadosDemo,
  limparStore, obterProdutosVendidos, reiniciarSistemaCompleto, reiniciarVendas
};
