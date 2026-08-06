const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'MERCEARIA_STOCK_DB',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  const connection = await pool.getConnection();
  try {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashed = await bcrypt.hash(adminPassword, 10);

    const [rows] = await connection.query("SELECT id FROM utilizadores WHERE username = 'admin'");
    if (rows.length === 0) {
      await connection.query(
        `INSERT INTO utilizadores (nome, username, password, perfil, estado) VALUES (?, ?, ?, 'ADMIN', 'ACTIVO')`,
        ['Administrador', 'admin', hashed]
      );
      console.log('Admin user created (username: admin)');
    } else {
      await connection.query(
        `UPDATE utilizadores SET password = ? WHERE username = 'admin'`,
        [hashed]
      );
      console.log('Admin password updated for username: admin');
    }
  } catch (err) {
    console.error('Erro ao criar/atualizar admin:', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

run();
