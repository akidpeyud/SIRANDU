const pool = require("../config/db");
const schedulerService = require("../services/schedulerService");

/**
 * 1. GET /api/cuaca
 * Mengambil ringkasan cuaca & status peringatan banjir untuk ke-11 Kecamatan Kota Jambi
 * Output: Disiapkan untuk penandaan marker di peta Leaflet & dashboard utama
 */
const getCuacaSemuaKecamatan = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        nama_kecamatan,
        latitude,
        longitude,
        curah_hujan_terkini,
        intensitas_terkini,
        status_peringatan,
        suhu_celsius,
        kelembapan_persen,
        sumber_data,
        to_char(terakhir_update, 'YYYY-MM-DD HH24:MI:SS') AS terakhir_update,
        is_delayed,
        CASE status_peringatan
          WHEN 'Siaga' THEN '#ef4444'     -- Merah
          WHEN 'Waspada' THEN '#f59e0b'   -- Kuning
          ELSE '#10b981'                  -- Hijau (Normal)
        END AS warna_status
      FROM kecamatan
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query);

    // Hitung ringkasan status kota
    let siagaCount = 0;
    let waspadaCount = 0;
    let normalCount = 0;
    let delayedCount = 0;

    rows.forEach((r) => {
      if (r.status_peringatan === "Siaga") siagaCount++;
      else if (r.status_peringatan === "Waspada") waspadaCount++;
      else normalCount++;

      if (r.is_delayed) delayedCount++;
    });

    res.status(200).json({
      success: true,
      ringkasan_kota: {
        total_kecamatan: rows.length,
        siaga: siagaCount,
        waspada: waspadaCount,
        normal: normalCount,
        data_tertunda_fallback: delayedCount,
      },
      data: rows,
    });
  } catch (err) {
    console.error("Error getCuacaSemuaKecamatan:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data cuaca kecamatan",
      error: err.message,
    });
  }
};

/**
 * 2. GET /api/cuaca/:id_kecamatan
 * Mengambil detail cuaca kecamatan + riwayat 24 jam terakhir untuk grafik React
 */
const getDetailCuacaKecamatan = async (req, res) => {
  try {
    const { id_kecamatan } = req.params;

    // Ambil data kecamatan
    const qKec = `
      SELECT 
        id, nama_kecamatan, latitude, longitude,
        curah_hujan_terkini, intensitas_terkini, status_peringatan,
        suhu_celsius, kelembapan_persen, sumber_data,
        to_char(terakhir_update, 'YYYY-MM-DD HH24:MI:SS') AS terakhir_update,
        is_delayed
      FROM kecamatan
      WHERE id = $1;
    `;
    const resKec = await pool.query(qKec, [id_kecamatan]);

    if (resKec.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kecamatan tidak ditemukan",
      });
    }

    const kec = resKec.rows[0];

    // Ambil riwayat log cuaca 24 jam terakhir untuk grafik
    const qLog = `
      SELECT 
        id,
        curah_hujan,
        intensitas,
        suhu,
        kelembapan,
        sumber,
        is_delayed,
        to_char(waktu, 'HH24:MI') AS jam_label,
        to_char(waktu, 'YYYY-MM-DD HH24:MI') AS waktu_lengkap
      FROM log_curah_hujan
      WHERE kecamatan_id = $1 AND waktu >= NOW() - INTERVAL '24 hours'
      ORDER BY waktu ASC;
    `;
    const resLog = await pool.query(qLog, [id_kecamatan]);

    res.status(200).json({
      success: true,
      kecamatan: kec,
      ambang_peringatan: {
        normal_maksimal: 5.0,
        waspada_rentang: "5.1 - 10.0 mm/jam",
        siaga_minimal: "> 10.0 mm/jam",
      },
      total_titik_grafik: resLog.rows.length,
      grafik_24_jam: resLog.rows,
    });
  } catch (err) {
    console.error("Error getDetailCuacaKecamatan:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data detail grafik cuaca",
      error: err.message,
    });
  }
};

/**
 * 3. POST /api/cuaca/sync-manual
 * Trigger manual untuk scheduler penarikan cuaca Open-Meteo
 */
const triggerManualSync = async (req, res) => {
  try {
    await schedulerService.syncCuacaKecamatan();
    res.status(200).json({
      success: true,
      message: "Sinkronisasi cuaca 11 kecamatan berhasil dijalankan!",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getCuacaSemuaKecamatan,
  getDetailCuacaKecamatan,
  triggerManualSync,
};
