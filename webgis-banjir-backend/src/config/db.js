const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "db_banjir",
  password: String(process.env.DB_PASSWORD || "sirandu"),
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Gagal terhubung ke database PostgreSQL:", err.message);
  } else {
    console.log("✅ Berhasil terhubung ke database PostgreSQL (PostGIS)!");
    release();
  }
});

module.exports = pool;
