const fs = require('fs');
const pool = require('../../src/config/db');

async function testStatements() {
  const sql = fs.readFileSync(__dirname + '/04_fase3_admin_dan_validasi_banjir.sql', 'utf8');
  // Pisahkan query berdasarkan semicolon (abaikan dalam text)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await pool.query(stmt);
      console.log(`[Query ${i+1}] OK: ${stmt.slice(0, 40).replace(/\n/g, ' ')}...`);
    } catch (e) {
      console.error(`[Query ${i+1}] ERROR: ${e.message}\nSQL: ${stmt}`);
      break;
    }
  }
  pool.end();
}

testStatements();
