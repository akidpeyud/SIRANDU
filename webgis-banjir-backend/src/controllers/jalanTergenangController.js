const pool = require("../config/db");

/**
 * GET /api/jalan-tergenang/geojson
 * Mengembalikan ruas jalan tergenang (LineString) dalam format GeoJSON FeatureCollection
 * Digunakan untuk menampilkan jalur merah (tertutup air) pada peta navigasi evakuasi
 */
const getJalanTergenangGeoJSON = async (req, res) => {
  try {
    const { status_tergenang, kecamatan } = req.query;
    let conditions = [];
    let values = [];

    if (status_tergenang !== undefined) {
      values.push(status_tergenang === "true");
      conditions.push(`status_tergenang = $${values.length}`);
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
                'nama_jalan', nama_jalan,
                'kecamatan', kecamatan,
                'status_tergenang', status_tergenang,
                'kedalaman_genangan_cm', kedalaman_genangan_cm,
                'keterangan', keterangan,
                'warna_garis', CASE WHEN status_tergenang THEN '#ef4444' ELSE '#10b981' END,
                'weight', 5,
                'updated_at', to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS')
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM ruas_jalan_tergenang
      ${whereClause};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getJalanTergenangGeoJSON:", err.message);
    res.status(500).json({ success: false, message: "Gagal memuat ruas jalan tergenang", error: err.message });
  }
};

module.exports = {
  getJalanTergenangGeoJSON,
};
