const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Test koneksi database saat inisialisasi
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Gagal terhubung ke database PostgreSQL:", err.message);
    return;
  }
  console.log("✅ Berhasil terhubung ke database PostgreSQL!");
  release();
});

module.exports = pool;
