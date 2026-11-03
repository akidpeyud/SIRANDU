const pool = require("../config/db");

/**
 * Algoritma Multi-Kriteria Skoring Risiko Banjir SIRANDU:
 * Menggabungkan:
 * 1. Curah Hujan (Bobot 60%)
 * 2. Kerentanan Wilayah & Topografi/Elevasi (Bobot 40%)
 */
const hitungSkorRisiko = (curahHujan, faktorKerentanan = 2, elevasi = 15.0) => {
  // 1. Subskor Curah Hujan (0 - 100)
  let subskorHujan = 10;
  const hujan = Number(curahHujan) || 0;
  if (hujan >= 70) {
    subskorHujan = 100;
  } else if (hujan >= 50) {
    subskorHujan = 75;
  } else if (hujan >= 20) {
    subskorHujan = 50;
  } else if (hujan > 5) {
    subskorHujan = 25;
  }

  // 2. Subskor Kerentanan & Elevasi (0 - 100)
  // Kerentanan: 1 (Rendah), 2 (Sedang), 3 (Tinggi / Dekat DAS Batanghari)
  let subskorKerentanan = 30;
  if (Number(faktorKerentanan) === 3) subskorKerentanan = 80;
  else if (Number(faktorKerentanan) === 2) subskorKerentanan = 50;

  // Penyesuaian Elevasi: Dataran rendah (< 12 mdpl di Jambi) lebih rentan genangan
  if (Number(elevasi) < 12) {
    subskorKerentanan += 20;
  } else if (Number(elevasi) > 25) {
    subskorKerentanan -= 10;
  }
  subskorKerentanan = Math.min(100, Math.max(10, subskorKerentanan));

  // 3. Skor Akhir Terbobot (Weighted Score)
  const skorAkhir = Math.round(subskorHujan * 0.6 + subskorKerentanan * 0.4);

  // 4. Penentuan Level & Rekomendasi Aksi Standar BNPB
  let statusRawan = "Aman";
  let rekomendasi = "Wilayah dalam kondisi normal dan terkendali. Tidak ada indikasi bahaya banjir.";
  let warnaHex = "#10b981"; // Emerald Green

  if (skorAkhir >= 85) {
    statusRawan = "Bahaya";
    warnaHex = "#e11d48"; // Rose Red
    rekomendasi = "🚨 AWAS/BAHAYA! Potensi genangan ekstrem > 70 cm. Aktifkan posko darurat, putus aliran listrik rumah tangga, dan evakuasi warga rentan ke titik aman.";
  } else if (skorAkhir >= 65) {
    statusRawan = "Siaga";
    warnaHex = "#f97316"; // Orange
    rekomendasi = "⚠️ SIAGA! Potensi luapan air 30 - 70 cm. Tim tanggap darurat disiagakan, pindahkan dokumen berharga dan kendaraan ke tempat tinggi.";
  } else if (skorAkhir >= 40) {
    statusRawan = "Waspada";
    warnaHex = "#f59e0b"; // Amber Yellow
    rekomendasi = "⚡ WASPADA! Potensi genangan air 10 - 30 cm di jalan dan pemukiman cekungan. Pastikan saluran drainase bersih dari sampah.";
  }

  return {
    skor_risiko: skorAkhir,
    status_rawan: statusRawan,
    rekomendasi: rekomendasi,
    warna: warnaHex,
  };
};

/**
 * Ringkasan Status Peringatan Dini Kota Jambi (Untuk Dashboard BPBD / Eksekutif)
 */
const getRingkasanEarlyWarning = async () => {
  const query = `
    SELECT id, nama_wilayah, curah_hujan, status_rawan, skor_risiko, rekomendasi, latitude, longitude,
           to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') as terakhir_update
    FROM wilayah_banjir
    ORDER BY skor_risiko DESC, curah_hujan DESC;
  `;
  const { rows } = await pool.query(query);

  let totalBahaya = 0;
  let totalSiaga = 0;
  let totalWaspada = 0;
  let totalAman = 0;

  rows.forEach((r) => {
    if (r.status_rawan === "Bahaya") totalBahaya++;
    else if (r.status_rawan === "Siaga") totalSiaga++;
    else if (r.status_rawan === "Waspada") totalWaspada++;
    else totalAman++;
  });

  // Level status agregat untuk satu kota
  let statusKota = "AMAN";
  if (totalBahaya > 0) statusKota = "BAHAYA";
  else if (totalSiaga > 0) statusKota = "SIAGA";
  else if (totalWaspada > 0) statusKota = "WASPADA";

  return {
    status_kota: statusKota,
    ringkasan_angka: {
      total_titik_terpantau: rows.length,
      bahaya: totalBahaya,
      siaga: totalSiaga,
      waspada: totalWaspada,
      aman: totalAman,
    },
    daftar_peringatan_aktif: rows.filter((r) => r.status_rawan === "Bahaya" || r.status_rawan === "Siaga"),
    semua_wilayah: rows,
  };
};

/**
 * Menghitung Zona Radius Dampak Bahaya (Buffer Spasial PostGIS)
 * Mengembalikan GeoJSON Polygon lingkaran zona terdampak (misal 500 meter)
 */
const getZonaDampakSpasial = async (wilayahId, radiusMeter = 500) => {
  const query = `
    SELECT json_build_object(
      'type', 'Feature',
      'id', id,
      'properties', json_build_object(
        'wilayah_id', id,
        'nama_wilayah', nama_wilayah,
        'status_rawan', status_rawan,
        'skor_risiko', skor_risiko,
        'radius_meter', $2::int,
        'rekomendasi', rekomendasi
      ),
      'geometry', ST_AsGeoJSON(ST_Buffer(geom::geography, $2::int)::geometry)::json
    ) AS zona_geojson
    FROM wilayah_banjir
    WHERE id = $1;
  `;

  const { rows } = await pool.query(query, [wilayahId, radiusMeter]);
  if (rows.length === 0 || !rows[0].zona_geojson) {
    throw new Error("Wilayah tidak ditemukan atau tidak memiliki data koordinat spasial");
  }

  return rows[0].zona_geojson;
};

module.exports = {
  hitungSkorRisiko,
  getRingkasanEarlyWarning,
  getZonaDampakSpasial,
};
