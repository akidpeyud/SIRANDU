const pool = require("../config/db");

// 1. Get Sumber Air Bersih format GeoJSON FeatureCollection
const getAirBersihGeoJSON = async (req, res) => {
  try {
    const { layak, kecamatan } = req.query;
    let conditions = [];
    let values = [];

    if (layak !== undefined) {
      values.push(layak === "true");
      conditions.push(`a.status_layak = $${values.length}`);
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
              'id', a.id,
              'geometry', ST_AsGeoJSON(a.geom)::json,
              'properties', json_build_object(
                'id', a.id,
                'nama_titik', a.nama_titik,
                'alamat', a.alamat,
                'kelurahan', w.nama_kelurahan,
                'kecamatan', w.nama_kecamatan,
                'pengelola', a.pengelola,
                'jam_operasional', a.jam_operasional,
                'debit_liter_detik', a.debit_liter_detik,
                'status_layak', a.status_layak,
                'keterangan', a.keterangan,
                'latitude', ST_Y(a.geom),
                'longitude', ST_X(a.geom),
                'warna_marker', CASE 
                  WHEN a.status_layak THEN '#06b6d4' -- Cyan (Air Bersih Layak)
                  ELSE '#94a3b8' -- Gray (Tercemar / Non-aktif)
                END
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM sumber_air_bersih a
      LEFT JOIN wilayah_administrasi w ON a.wilayah_id = w.id
      ${whereClause};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getAirBersihGeoJSON:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data air bersih GeoJSON",
      error: err.message,
    });
  }
};

// 2. Get Air Bersih Terdekat dari Koordinat Pengguna
const getAirBersihTerdekat = async (req, res) => {
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
        a.id,
        a.nama_titik,
        a.alamat,
        w.nama_kelurahan,
        w.nama_kecamatan,
        a.pengelola,
        a.jam_operasional,
        a.debit_liter_detik,
        a.status_layak,
        a.keterangan,
        ST_Y(a.geom) AS latitude,
        ST_X(a.geom) AS longitude,
        ROUND(ST_Distance(a.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS jarak_meter
      FROM sumber_air_bersih a
      LEFT JOIN wilayah_administrasi w ON a.wilayah_id = w.id
      WHERE a.status_layak = true
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
    console.error("Error getAirBersihTerdekat:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mencari titik air bersih terdekat",
      error: err.message,
    });
  }
};

// 3. Get All Air Bersih Tabular
const getAllAirBersih = async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id, a.nama_titik, a.alamat, a.wilayah_id,
        w.nama_kelurahan, w.nama_kecamatan,
        a.pengelola, a.jam_operasional, a.debit_liter_detik,
        a.status_layak, a.keterangan,
        ST_Y(a.geom) AS latitude, ST_X(a.geom) AS longitude,
        to_char(a.updated_at, 'YYYY-MM-DD HH24:MI:SS') AS updated_at
      FROM sumber_air_bersih a
      LEFT JOIN wilayah_administrasi w ON a.wilayah_id = w.id
      ORDER BY a.id ASC;
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

// 4. Create Air Bersih (Admin F10)
const createAirBersih = async (req, res) => {
  try {
    const { nama_titik, alamat, wilayah_id, pengelola, jam_operasional, debit_liter_detik, status_layak, keterangan, latitude, longitude } = req.body;

    if (!nama_titik || !alamat || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "nama_titik, alamat, latitude, dan longitude wajib diisi!",
      });
    }

    const query = `
      INSERT INTO sumber_air_bersih (
        nama_titik, alamat, wilayah_id, pengelola, jam_operasional, debit_liter_detik, status_layak, keterangan, geom
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($10, $9), 4326))
      RETURNING id, nama_titik, alamat, pengelola, status_layak, ST_Y(geom) AS latitude, ST_X(geom) AS longitude;
    `;

    const values = [
      nama_titik,
      alamat,
      wilayah_id || null,
      pengelola || "PDAM Tirta Mayang",
      jam_operasional || "24 Jam",
      debit_liter_detik ? parseFloat(debit_liter_detik) : null,
      status_layak !== undefined ? status_layak : true,
      keterangan || "",
      parseFloat(latitude),
      parseFloat(longitude),
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      success: true,
      message: "Titik air bersih berhasil ditambahkan!",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Update Air Bersih
const updateAirBersih = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_titik, alamat, pengelola, jam_operasional, debit_liter_detik, status_layak, keterangan } = req.body;

    const query = `
      UPDATE sumber_air_bersih
      SET 
        nama_titik = COALESCE($1, nama_titik),
        alamat = COALESCE($2, alamat),
        pengelola = COALESCE($3, pengelola),
        jam_operasional = COALESCE($4, jam_operasional),
        debit_liter_detik = COALESCE($5, debit_liter_detik),
        status_layak = COALESCE($6, status_layak),
        keterangan = COALESCE($7, keterangan),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    const values = [nama_titik, alamat, pengelola, jam_operasional, debit_liter_detik, status_layak, keterangan, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Titik air bersih tidak ditemukan" });
    }

    res.status(200).json({
      success: true,
      message: "Data titik air bersih berhasil diperbarui!",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Delete Air Bersih
const deleteAirBersih = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM sumber_air_bersih WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Titik air bersih tidak ditemukan" });
    }

    res.status(200).json({ success: true, message: "Titik air bersih berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAirBersihGeoJSON,
  getAirBersihTerdekat,
  getAllAirBersih,
  createAirBersih,
  updateAirBersih,
  deleteAirBersih,
};
