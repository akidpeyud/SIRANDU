const pool = require('../config/db');

async function fixConstraint() {
  await pool.query(`
    DELETE FROM log_curah_hujan a USING log_curah_hujan b 
    WHERE a.id < b.id AND a.kecamatan_id = b.kecamatan_id AND a.waktu = b.waktu;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_log_waktu_kec'
      ) THEN
        ALTER TABLE log_curah_hujan ADD CONSTRAINT uq_log_waktu_kec UNIQUE (kecamatan_id, waktu);
      END IF;
    END $$;
  `);

  console.log('✅ Unique constraint uq_log_waktu_kec siap!');
  pool.end();
}

fixConstraint().catch(err => {
  console.error('Error:', err.message);
  pool.end();
});
