# Database MySQL - Sistema de Gestão de Stock

## 📋 Descrição

Script SQL completo para criar a base de dados **MERCEARIA_STOCK_DB** com todas as tabelas, relacionamentos, índices e dados iniciais necessários para o sistema de gestão de stock.

---

## 🗂️ Tabelas Criadas

### 1. **utilizadores** 
Armazena os usuários do sistema (Admin e Vendedores)
- **Campos principais**: id, nome, username, password, perfil, telefone, estado, dataCadastro
- **Dados iniciais**: 1 usuário admin (username: `admin`, password: `admin123`)

### 2. **categorias**
Categorias de produtos
- **Dados iniciais**: 5 categorias padrão (Alimentos, Bebidas, Limpeza, Higiene, Outros)

### 3. **fornecedores**
Informações dos fornecedores de produtos
- **Campos**: nome, contacto, telefone, email, endereço, NIF, IBAN, etc.

### 4. **produtos**
Inventário de produtos
- **Campos principais**: codigo, nome, categoriaId, precoCompra, precoVenda, stock, stockMinimo, dataValidade, estado

### 5. **entradas**
Registro de entradas de produtos no estoque
- **Relacionamentos**: produto, fornecedor, utilizador

### 6. **vendas**
Registro de vendas realizadas
- **Campos**: utilizadorId, dataVenda, totalVenda, desconto, metodoPagamento, estado

### 7. **itensVenda**
Itens individuais de cada venda
- **Relacionamentos**: vendaId, produtoId

### 8. **historico**
Log de todas as operações do sistema
- **Campos**: utilizador, acao, descricao, dataOperacao

### 9. **configuracoes**
Configurações gerais do sistema
- **Dados iniciais**: configurações como moeda, dias de aviso de validade, margem de lucro, etc.

---

## 🚀 Como Usar

### Opção 1: Usando MySQL Workbench
1. Abra **MySQL Workbench**
2. Conecte-se ao seu servidor MySQL
3. Abra o arquivo `database.sql`
4. Execute o script completo (Ctrl + Shift + Enter)

### Opção 2: Usando Linha de Comando
```bash
mysql -u seu_usuario -p < caminho/para/database.sql
```

Ou:
```bash
mysql -u seu_usuario -p
mysql> source /caminho/para/database.sql;
```

### Opção 3: Usando PhpMyAdmin
1. Abra **PhpMyAdmin**
2. Clique em "SQL" no topo
3. Cole o conteúdo do arquivo `database.sql`
4. Clique em "Executar"

---

## 📊 Dados Iniciais

O script cria automaticamente:

- **1 Usuário Admin**
  - Username: `admin`
  - Password: `admin123`
  - ⚠️ **Altere a senha após o primeiro login!**

- **5 Categorias padrão**
  - Alimentos
  - Bebidas
  - Limpeza
  - Higiene
  - Outros

- **9 Configurações padrão**
  - Moeda: AOA
  - Dias de aviso de validade: 15 dias
  - Margem de lucro padrão: 30%

---

## 🔗 Relacionamentos

```
utilizadores
    ├─ vendas (um para muitos)
    ├─ entradas (um para muitos)
    └─ historico (referência)

categorias
    └─ produtos (um para muitos)

fornecedores
    └─ entradas (um para muitos)

produtos
    ├─ entradas (um para muitos)
    ├─ itensVenda (um para muitos)
    └─ vw_resumo_stock (view)

vendas
    ├─ itensVenda (um para muitos) [CASCADE DELETE]
    └─ vw_vendas_por_dia (view)
```

---

## 📈 Views Incluídas

### 1. **vw_resumo_stock**
Resumo completo do inventário com status de stock e validade
- Mostra estado do stock (NORMAL, BAIXO, CRITICO, SEM_STOCK)
- Mostra estado de validade (VALIDO, PROXIMO_VENCER, EXPIRADO)
- Calcula valor total do stock

### 2. **vw_vendas_por_dia**
Resumo de vendas diárias
- Número de vendas por dia
- Total vendido por dia
- Número de vendedores ativos

### 3. **vw_produtos_criticos**
Lista de produtos com stock crítico
- Produtos com stock baixo ou zerado
- Facilita reposição de estoque

### 4. **vw_performance_vendedores**
Performance de cada vendedor
- Total de vendas
- Total vendido
- Ticket médio
- Última venda realizada

---

## 🔑 Índices Criados

Todos os campos frequentemente consultados possuem índices para melhor performance:
- `utilizadores`: username, perfil, estado, dataCadastro
- `produtos`: codigo, nome, categoriaId, estado, stock
- `categorias`: nome, estado
- `vendas`: utilizadorId, dataVenda, estado
- `itensVenda`: vendaId, produtoId
- `historico`: utilizador, acao, dataOperacao

---

## 🔐 Segurança

⚠️ **Recomendações importantes:**

1. **Altere a senha do admin** imediatamente após criar a base de dados
2. **Use HTTPS** se implementar um servidor web
3. **Adicione validação** de entrada de dados na aplicação
4. **Implemente autenticação com hash** (bcrypt, sha256, etc.)
5. **Configure permissões** apropriadas no MySQL

### Criar usuário MySQL seguro (Recomendado)
```sql
CREATE USER 'stok_user'@'localhost' IDENTIFIED BY 'senha_forte_123';
GRANT ALL PRIVILEGES ON MERCEARIA_STOCK_DB.* TO 'stok_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 🔧 Conexão da Aplicação

Para conectar a aplicação JavaScript com o MySQL, você precisará de um backend (Node.js, PHP, Python, etc.).

### Exemplo com Node.js + Express
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'stok_user',
  password: 'senha_forte_123',
  database: 'MERCEARIA_STOCK_DB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Usar a pool para fazer queries
```

### Exemplo com PHP
```php
$conexao = new mysqli('localhost', 'stok_user', 'senha_forte_123', 'MERCEARIA_STOCK_DB');
if ($conexao->connect_error) {
  die('Erro: ' . $conexao->connect_error);
}
```

---

## 📝 Notas Adicionais

- A base de dados usa **UTF-8** para suportar caracteres especiais
- Todos os timestamps são automáticos (CURRENT_TIMESTAMP)
- Campos de data/atualização são automaticamente atualizados
- O engine utilizado é **InnoDB** para suportar integridade referencial
- As constraints garantem consistência dos dados

---

## ❓ Troubleshooting

**Erro: "Access denied for user"**
- Verifique o usuário e senha
- Certifique-se que o usuário tem permissões na base de dados

**Erro: "Database already exists"**
- A base de dados já foi criada anteriormente
- Execute apenas as queries que desejar atualizar

**Erro: "Foreign key constraint fails"**
- Tente desabilitar verificação de constraints temporariamente:
  ```sql
  SET FOREIGN_KEY_CHECKS=0;
  -- suas queries aqui
  SET FOREIGN_KEY_CHECKS=1;
  ```

---

## 📞 Suporte

Para questões específicas sobre o banco de dados, consulte a documentação oficial do MySQL:
https://dev.mysql.com/doc/

---

**Criado para:** Sistema de Gestão de Stock  
**Data:** 2026  
**Versão:** 1.0
