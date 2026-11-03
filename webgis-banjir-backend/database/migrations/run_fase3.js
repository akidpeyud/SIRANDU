const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('../../src/config/db');

async function runMigration() {
  const sql = fs.readFileSync(__dirname + '/04_fase3_admin_dan_validasi_banjir.sql', 'utf8');
  await pool.query(sql);

  // Update password admin dengan hash bcrypt asli
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`
    INSERT INTO admin_users (username, password_hash, nama_lengkap, role)
    VALUES ('admin', $1, 'Administrator SIRANDU BPBD Kota Jambi', 'superadmin')
    ON CONFLICT (username) DO UPDATE SET password_hash = $1;
  `, [hash]);

  console.log('✅ Migrasi Fase 3 SQL Sukses!');
  console.log('🔑 Akun Admin Terdaftar: username = admin, password = admin123');
  pool.end();
}

runMigration().catch(err => {
  console.error('❌ Error migrasi Fase 3:', err);
  pool.end();
});
