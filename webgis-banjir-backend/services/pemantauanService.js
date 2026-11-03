const pool = require("../config/db");
const notifikasiService = require("./notifikasiService");

/**
 * Konversi nilai curah hujan ke klasifikasi resmi BMKG
 */
const getKlasifikasiBMKG = (curahHujan) => {
  const val = Number(curahHujan) || 0;
  if (val >= 150) return "Hujan Ekstrem";
  if (val >= 100) return "Hujan Sangat Lebat";
  if (val >= 50) return "Hujan Lebat";
  if (val >= 20) return "Hujan Sedang";
  if (val > 0.5) return "Hujan Ringan";
  return "Berawan / Tidak Ada Hujan";
};

/**
 * F04: Mengambil Riwayat Curah Hujan untuk Grafik Tren (React Charts)
 */
const getGrafikCurahHujan = async (wilayahId, days = 7) => {
  const query = `
    SELECT 
      id,
      curah_hujan,
      intensitas_bmkg,
      suhu_celsius,
      kelembapan_persen,
      sumber_data,
      to_char(waktu_pengamatan, 'YYYY-MM-DD HH24:MI') AS waktu_label,
      waktu_pengamatan
    FROM pemantauan_cuaca
    WHERE wilayah_id = $1 AND waktu_pengamatan >= NOW() - INTERVAL '1 day' * $2
    ORDER BY waktu_pengamatan ASC;
  `;

  const { rows } = await pool.query(query, [wilayahId, parseInt(days) || 7]);

  // Ambil info nama kelurahan & ambang batasnya
  const qWil = "SELECT id, nama_kecamatan, nama_kelurahan, status_siaga, ambang_hujan_waspada, ambang_hujan_siaga FROM wilayah_administrasi WHERE id = $1";
  const resWil = await pool.query(qWil, [wilayahId]);
  const wilayah = resWil.rows[0] || null;

  return {
    wilayah: wilayah,
    total_data_points: rows.length,
    ambang_batas: {
      waspada: wilayah ? parseFloat(wilayah.ambang_hujan_waspada) : 20.0,
      siaga: wilayah ? parseFloat(wilayah.ambang_hujan_siaga) : 50.0,
    },
    data_grafik: rows,
  };
};

/**
 * F04 & F05: Catat Curah Hujan Baru & Evaluasi Otomatis Status Siaga Wilayah
 */
const catatDanEvaluasiCuaca = async (wilayahId, curahHujan, suhu = 28, kelembapan = 85, sumber = "BMKG & Open-Meteo") => {
  const hujan = parseFloat(curahHujan) || 0;
  const intensitas = getKlasifikasiBMKG(hujan);

  // 1. Simpan ke tabel pemantauan_cuaca
  const insertQuery = `
    INSERT INTO pemantauan_cuaca (wilayah_id, curah_hujan, intensitas_bmkg, suhu_celsius, kelembapan_persen, sumber_data, waktu_pengamatan)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    RETURNING *;
  `;
  await pool.query(insertQuery, [wilayahId, hujan, intensitas, suhu, kelembapan, sumber]);

  // 2. Cek status wilayah saat ini dan ambang batasnya
  const qWil = "SELECT id, nama_kecamatan, nama_kelurahan, status_siaga, ambang_hujan_waspada, ambang_hujan_siaga FROM wilayah_administrasi WHERE id = $1";
  const resWil = await pool.query(qWil, [wilayahId]);
  if (resWil.rows.length === 0) return;

  const w = resWil.rows[0];
  const statusLama = w.status_siaga;
  const ambangWaspada = parseFloat(w.ambang_hujan_waspada);
  const ambangSiaga = parseFloat(w.ambang_hujan_siaga);

  let statusBaru = "Normal";
  if (hujan >= ambangSiaga) {
    statusBaru = "Siaga";
  } else if (hujan >= ambangWaspada) {
    statusBaru = "Waspada";
  }

  // 3. Update status jika berubah
  if (statusLama !== statusBaru) {
    await pool.query("UPDATE wilayah_administrasi SET status_siaga = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [statusBaru, wilayahId]);

    // 4. Deteksi Eskalasi Status (Normal -> Waspada, Waspada -> Siaga, Normal -> Siaga)
    const tingkatUrutan = { "Normal": 1, "Waspada": 2, "Siaga": 3 };
    if (tingkatUrutan[statusBaru] > tingkatUrutan[statusLama]) {
      console.log(`🚨 ESKALASI STATUS TERDETEKSI: ${w.nama_kelurahan} naik dari ${statusLama} ke ${statusBaru}!`);
      // Pemicu Notifikasi Email Otomatis (F06)
      await notifikasiService.kirimEmailEskalasi(wilayahId, statusLama, statusBaru, hujan);
    }
  }

  return {
    wilayah: w.nama_kelurahan,
    curah_hujan: hujan,
    intensitas_bmkg: intensitas,
    status_sebelumnya: statusLama,
    status_sekarang: statusBaru,
  };
};

module.exports = {
  getKlasifikasiBMKG,
  getGrafikCurahHujan,
  catatDanEvaluasiCuaca,
};
