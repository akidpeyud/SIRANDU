const pool = require("../config/db");
const { hitungSkorRisiko } = require("../services/earlyWarningService");

// 1. Ambil semua data wilayah (Format tabular array biasa untuk tabel/list)
const getAllWilayah = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nama_wilayah, curah_hujan, status_rawan, skor_risiko, rekomendasi, 
              faktor_kerentanan, elevasi, latitude, longitude, 
              to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
       FROM wilayah_banjir 
       ORDER BY skor_risiko DESC, id ASC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error getAllWilayah:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data wilayah banjir",
      error: err.message,
    });
  }
};

// 2. Ambil data wilayah dalam format standar GeoJSON (FeatureCollection untuk React-Leaflet)
const getWilayahGeoJSON = async (req, res) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          json_agg(
            json_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', json_build_object(
                'id', id,
                'nama_wilayah', nama_wilayah,
                'curah_hujan', curah_hujan,
                'status_rawan', status_rawan,
                'skor_risiko', skor_risiko,
                'rekomendasi', rekomendasi,
                'faktor_kerentanan', faktor_kerentanan,
                'elevasi', elevasi,
                'latitude', latitude,
                'longitude', longitude,
                'updated_at', to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS')
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM wilayah_banjir;
    `;

    const result = await pool.query(query);

    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getWilayahGeoJSON:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal memproses data GeoJSON spasial",
      error: err.message,
    });
  }
};

// 3. Tambah data wilayah baru (Otomatis hitung skor risiko & generate PostGIS Geometry)
const createWilayah = async (req, res) => {
  try {
    const { nama_wilayah, curah_hujan, latitude, longitude, faktor_kerentanan, elevasi } = req.body;

    // Validasi input
    if (!nama_wilayah || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "nama_wilayah, latitude, dan longitude wajib diisi!",
      });
    }

    const hujan = parseFloat(curah_hujan) || 0;
    const kerentanan = parseInt(faktor_kerentanan) || 2;
    const elev = parseFloat(elevasi) || 15.0;

    // Hitung analisis risiko awal
    const analisis = hitungSkorRisiko(hujan, kerentanan, elev);

    const query = `
      INSERT INTO wilayah_banjir (
        nama_wilayah, curah_hujan, status_rawan, skor_risiko, rekomendasi, 
        faktor_kerentanan, elevasi, latitude, longitude, geom, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($9, $8), 4326), CURRENT_TIMESTAMP)
      RETURNING id, nama_wilayah, curah_hujan, status_rawan, skor_risiko, rekomendasi, latitude, longitude, ST_AsGeoJSON(geom)::json AS geom_geojson;
    `;
    const values = [
      nama_wilayah,
      hujan,
      analisis.status_rawan,
      analisis.skor_risiko,
      analisis.rekomendasi,
      kerentanan,
      elev,
      latitude,
      longitude,
    ];
    const newWilayah = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "Data wilayah, analisis risiko & geometri spasial berhasil ditambahkan!",
      data: newWilayah.rows[0],
    });
  } catch (err) {
    console.error("Error createWilayah:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal menyimpan data wilayah",
      error: err.message,
    });
  }
};

module.exports = {
  getAllWilayah,
  getWilayahGeoJSON,
  createWilayah,
};
