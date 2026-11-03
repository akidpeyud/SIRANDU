const pool = require("../config/db");

/**
 * GET /api/titik-banjir/geojson
 * Mengembalikan seluruh titik banjir historis dalam format GeoJSON FeatureCollection
 * Siap langsung dirender ke komponen <GeoJSON /> di React-Leaflet
 */
const getTitikBanjirGeoJSON = async (req, res) => {
  try {
    const { tahun, kecamatan } = req.query;
    let conditions = [];
    let values = [];

    if (tahun) {
      values.push(parseInt(tahun, 10));
      conditions.push(`tahun_kejadian = $${values.length}`);
    }

    if (kecamatan && kecamatan !== "Semua") {
      values.push(kecamatan);
      conditions.push(`LOWER(kecamatan) = LOWER($${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
                'nama_lokasi', nama_lokasi,
                'kecamatan', kecamatan,
                'tanggal_kejadian', tanggal_kejadian,
                'tahun_kejadian', tahun_kejadian,
                'tinggi_genangan_cm', tinggi_genangan_cm,
                'lama_genangan_jam', lama_genangan_jam,
                'keterangan', keterangan,
                'latitude', ST_Y(geom),
                'longitude', ST_X(geom),
                'warna_marker', '#dc2626' -- Merah Bahaya Historis
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM titik_banjir_historis
      ${whereClause};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getTitikBanjirGeoJSON:", err.message);
    res.status(500).json({ success: false, message: "Gagal memuat titik banjir historis", error: err.message });
  }
};

module.exports = {
  getTitikBanjirGeoJSON,
};
