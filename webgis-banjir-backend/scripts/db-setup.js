/**
 * Menyiapkan database SIRANDU dari nol dengan urutan yang benar:
 *   1) database/migrations/*.sql   (skema + ekstensi PostGIS/pgRouting)
 *   2) database/seeds/*.sql        (data awal)
 *   3) database/seeds/07_import_official_geojson.js (poligon kecamatan resmi)
 *   4) akun admin (admin / admin123 -> GANTI setelah login pertama)
 *
 * Pakai:  npm run db:setup
 * Syarat: PostgreSQL + PostGIS + pgRouting sudah terpasang, database (DB_NAME) sudah dibuat,
 *         dan .env berisi DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const root = path.resolve(__dirname, '..')
const pool = new Pool({
  user: process.env.DB_USER || 'postgres', host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'db_banjir', password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT, 10) || 5432,
})
const sqlFiles = (dir) => fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(dir, f))

async function runSql(rel) {
  process.stdout.write(`  • ${rel} … `)
  try { await pool.query(fs.readFileSync(path.join(root, rel), 'utf8')); console.log('ok') }
  catch (e) { console.log('GAGAL'); console.error('    ' + e.message); throw e }
}

;(async () => {
  try {
    console.log('1) Migrasi skema'); for (const f of sqlFiles('database/migrations')) await runSql(f)
    console.log('2) Seed data awal'); for (const f of sqlFiles('database/seeds')) await runSql(f)
    console.log('3) Impor poligon kecamatan resmi')
    const r = spawnSync(process.execPath, [path.join(root, 'database/seeds/07_import_official_geojson.js')], { cwd: root, stdio: 'inherit' })
    if (r.status !== 0) throw new Error('Impor GeoJSON gagal (cek DB_USER/DB_NAME di .env)')
    console.log('4) Akun admin')
    const hash = await bcrypt.hash('admin123', 10)
    await pool.query(`INSERT INTO admin_users (username, password_hash, nama_lengkap, role)
      VALUES ('admin', $1, 'Administrator SIRANDU', 'superadmin')
      ON CONFLICT (username) DO UPDATE SET password_hash = $1`, [hash])
    console.log('\n✅ Database siap. Login admin: admin / admin123 (segera ganti).')
  } catch (e) { console.error('\n❌ Setup berhenti:', e.message); process.exitCode = 1 } finally { await pool.end() }
})()
