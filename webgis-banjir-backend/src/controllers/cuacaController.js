const pool = require("../config/db");
const { syncWeatherOpenMeteo } = require("../services/weatherScheduler");

/**
 * 1. GET /api/cuaca
 * Mengambil ringkasan cuaca dan status peringatan banjir 11 Kecamatan di Kota Jambi.
 * Siap dikonsumsi frontend React untuk marker peta Leaflet dan ringkasan dashboard.
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
          WHEN 'Waspada' THEN '#f59e0b'   -- Oranye/Kuning
          ELSE '#10b981'                  -- Hijau (Normal)
        END AS warna_status
      FROM kecamatan
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query);

    // Hitung ringkasan status Kota Jambi
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
 * Mengambil detail status kecamatan beserta riwayat curah hujan 24 jam terakhir (log_curah_hujan).
 * Format siap konsumsi untuk komponen grafik Chart.js / Recharts di React (F04).
 */
const getDetailCuacaKecamatan = async (req, res) => {
  try {
    const { id_kecamatan } = req.params;

    // 1. Ambil data master kecamatan
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
        message: "Data kecamatan tidak ditemukan",
      });
    }

    const kec = resKec.rows[0];

    // 2. Ambil riwayat log 24 jam terakhir
    const qLog = `
      SELECT 
        curah_hujan,
        intensitas,
        suhu,
        kelembapan,
        to_char(waktu, 'HH24:MI') AS jam_label,
        to_char(waktu, 'YYYY-MM-DD HH24:MI') AS waktu_lengkap,
        sumber,
        is_delayed
      FROM log_curah_hujan
      WHERE kecamatan_id = $1
      ORDER BY waktu ASC
      LIMIT 24;
    `;
    const resLog = await pool.query(qLog, [id_kecamatan]);

    res.status(200).json({
      success: true,
      kecamatan: kec,
      grafik_24_jam: resLog.rows,
    });
  } catch (err) {
    console.error("Error getDetailCuacaKecamatan:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat grafik curah hujan kecamatan",
      error: err.message,
    });
  }
};

/**
 * 3. POST /api/cuaca/sync-manual
 * Endpoint pengujian untuk memicu sync Open-Meteo secara manual.
 */
const triggerManualSync = async (req, res) => {
  try {
    await syncWeatherOpenMeteo();
    res.status(200).json({
      success: true,
      message: "Sinkronisasi data cuaca 11 kecamatan berhasil dijalankan!",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal memicu sinkronisasi manual cuaca",
      error: err.message,
    });
  }
};

module.exports = {
  getCuacaSemuaKecamatan,
  getDetailCuacaKecamatan,
  triggerManualSync,
};
