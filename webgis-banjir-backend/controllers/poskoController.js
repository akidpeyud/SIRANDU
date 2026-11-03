const pool = require("../config/db");

// 1. Get Posko dalam format GeoJSON FeatureCollection (Untuk React-Leaflet)
const getPoskoGeoJSON = async (req, res) => {
  try {
    const { aktif, kecamatan } = req.query;
    let conditions = [];
    let values = [];

    if (aktif !== undefined) {
      values.push(aktif === "true");
      conditions.push(`p.status_aktif = $${values.length}`);
    }

    if (kecamatan && kecamatan !== "Semua") {
      values.push(kecamatan);
      conditions.push(`LOWER(w.nama_kecamatan) = LOWER($${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          json_agg(
            json_build_object(
              'type', 'Feature',
              'id', p.id,
              'geometry', ST_AsGeoJSON(p.geom)::json,
              'properties', json_build_object(
                'id', p.id,
                'nama_posko', p.nama_posko,
                'alamat', p.alamat,
                'kelurahan', w.nama_kelurahan,
                'kecamatan', w.nama_kecamatan,
                'kapasitas_jiwa', p.kapasitas_jiwa,
                'terisi_jiwa', p.terisi_jiwa,
                'sisa_kapasitas', (p.kapasitas_jiwa - p.terisi_jiwa),
                'persentase_terisi', ROUND((p.terisi_jiwa::numeric / NULLIF(p.kapasitas_jiwa, 0)) * 100, 1),
                'kontak_pj', p.kontak_pj,
                'fasilitas', p.fasilitas,
                'status_aktif', p.status_aktif,
                'latitude', ST_Y(p.geom),
                'longitude', ST_X(p.geom),
                'warna_marker', CASE 
                  WHEN NOT p.status_aktif THEN '#64748b' -- Gray (Non-aktif)
                  WHEN (p.kapasitas_jiwa - p.terisi_jiwa) <= 0 THEN '#ef4444' -- Red (Penuh)
                  ELSE '#3b82f6' -- Blue (Tersedia)
                END
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM posko_pengungsian p
      LEFT JOIN wilayah_administrasi w ON p.wilayah_id = w.id
      ${whereClause};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getPoskoGeoJSON:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data posko GeoJSON",
      error: err.message,
    });
  }
};

// 2. Get Posko Terdekat dari Koordinat Pengguna (PostGIS ST_Distance)
const getPoskoTerdekat = async (req, res) => {
  try {
    const { lat, lng, limit = 3 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Query parameter lat dan lng wajib disertakan!",
      });
    }

    const query = `
      SELECT 
        p.id,
        p.nama_posko,
        p.alamat,
        w.nama_kelurahan,
        w.nama_kecamatan,
        p.kapasitas_jiwa,
        p.terisi_jiwa,
        (p.kapasitas_jiwa - p.terisi_jiwa) AS sisa_kapasitas,
        p.kontak_pj,
        p.fasilitas,
        ST_Y(p.geom) AS latitude,
        ST_X(p.geom) AS longitude,
        ROUND(ST_Distance(p.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS jarak_meter
      FROM posko_pengungsian p
      LEFT JOIN wilayah_administrasi w ON p.wilayah_id = w.id
      WHERE p.status_aktif = true AND (p.kapasitas_jiwa - p.terisi_jiwa) > 0
      ORDER BY jarak_meter ASC
      LIMIT $3;
    `;

    const result = await pool.query(query, [parseFloat(lng), parseFloat(lat), parseInt(limit)]);

    res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error getPoskoTerdekat:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mencari posko terdekat",
      error: err.message,
    });
  }
};

// 3. Get All Posko Tabular
const getAllPosko = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, p.nama_posko, p.alamat, p.wilayah_id,
        w.nama_kelurahan, w.nama_kecamatan,
        p.kapasitas_jiwa, p.terisi_jiwa,
        (p.kapasitas_jiwa - p.terisi_jiwa) AS sisa_kapasitas,
        p.kontak_pj, p.fasilitas, p.status_aktif,
        ST_Y(p.geom) AS latitude, ST_X(p.geom) AS longitude,
        to_char(p.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
      FROM posko_pengungsian p
      LEFT JOIN wilayah_administrasi w ON p.wilayah_id = w.id
      ORDER BY p.id ASC;
    `;
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Create Posko (Admin F10)
const createPosko = async (req, res) => {
  try {
    const { nama_posko, alamat, wilayah_id, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, latitude, longitude } = req.body;

    if (!nama_posko || !alamat || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "nama_posko, alamat, latitude, dan longitude wajib diisi!",
      });
    }

    const query = `
      INSERT INTO posko_pengungsian (
        nama_posko, alamat, wilayah_id, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, geom
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($10, $9), 4326))
      RETURNING id, nama_posko, alamat, kapasitas_jiwa, terisi_jiwa, status_aktif, ST_Y(geom) AS latitude, ST_X(geom) AS longitude;
    `;

    const values = [
      nama_posko,
      alamat,
      wilayah_id || null,
      parseInt(kapasitas_jiwa) || 50,
      parseInt(terisi_jiwa) || 0,
      kontak_pj || "",
      fasilitas || "",
      status_aktif !== undefined ? status_aktif : true,
      parseFloat(latitude),
      parseFloat(longitude),
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      success: true,
      message: "Posko pengungsian berhasil ditambahkan!",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Update Posko
const updatePosko = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_posko, alamat, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif } = req.body;

    const query = `
      UPDATE posko_pengungsian
      SET 
        nama_posko = COALESCE($1, nama_posko),
        alamat = COALESCE($2, alamat),
        kapasitas_jiwa = COALESCE($3, kapasitas_jiwa),
        terisi_jiwa = COALESCE($4, terisi_jiwa),
        kontak_pj = COALESCE($5, kontak_pj),
        fasilitas = COALESCE($6, fasilitas),
        status_aktif = COALESCE($7, status_aktif),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    const values = [nama_posko, alamat, kapasitas_jiwa, terisi_jiwa, kontak_pj, fasilitas, status_aktif, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Posko tidak ditemukan" });
    }

    res.status(200).json({
      success: true,
      message: "Data posko berhasil diperbarui!",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Delete Posko
const deletePosko = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM posko_pengungsian WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Posko tidak ditemukan" });
    }

    res.status(200).json({ success: true, message: "Posko berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPoskoGeoJSON,
  getPoskoTerdekat,
  getAllPosko,
  createPosko,
  updatePosko,
  deletePosko,
};
