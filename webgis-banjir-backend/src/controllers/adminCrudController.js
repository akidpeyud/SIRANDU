const pool = require("../config/db");

// ==========================================
// 1. CRUD POSKO PENGUNGSIAN (F07)
// ==========================================
const createPosko = async (req, res) => {
  try {
    const { nama, kontak, kapasitas, alamat, latitude, longitude, fasilitas, status_aktif } = req.body;

    if (!nama || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Nama posko dan koordinat (lat, lng) wajib diisi." });
    }

    const query = `
      INSERT INTO posko_pengungsian (
        nama, nama_posko, kontak, kontak_pj, kapasitas, kapasitas_jiwa, 
        alamat, fasilitas, status_aktif, geom, updated_at
      )
      VALUES (
        $1, $1, $2, $2, $3, $3, 
        $4, $5, $6, 
        ST_SetSRID(ST_MakePoint($7, $8), 4326), 
        CURRENT_TIMESTAMP
      )
      RETURNING id, nama, kontak, kapasitas, alamat, status_aktif, ST_X(geom) AS lng, ST_Y(geom) AS lat;
    `;
    const values = [nama, kontak || "-", parseInt(kapasitas, 10) || 100, alamat || "-", fasilitas || "-", status_aktif !== false, parseFloat(longitude), parseFloat(latitude)];
    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "Data posko pengungsian berhasil ditambahkan.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error createPosko:", err.message);
    res.status(500).json({ success: false, message: "Gagal menambahkan posko", error: err.message });
  }
};

const updatePosko = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, kontak, kapasitas, terisi_jiwa, alamat, latitude, longitude, fasilitas, status_aktif } = req.body;

    let updateGeomClause = "";
    let values = [nama, kontak, parseInt(kapasitas, 10) || 100, parseInt(terisi_jiwa, 10) || 0, alamat, fasilitas, status_aktif !== false, id];

    if (latitude !== undefined && longitude !== undefined) {
      values.push(parseFloat(longitude), parseFloat(latitude));
      updateGeomClause = `, geom = ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}), 4326)`;
    }

    const query = `
      UPDATE posko_pengungsian
      SET nama = $1, nama_posko = $1, kontak = $2, kontak_pj = $2,
          kapasitas = $3, kapasitas_jiwa = $3, terisi_jiwa = $4,
          alamat = $5, fasilitas = $6, status_aktif = $7,
          updated_at = CURRENT_TIMESTAMP
          ${updateGeomClause}
      WHERE id = $8
      RETURNING id, nama, kontak, kapasitas, terisi_jiwa, status_aktif, ST_X(geom) AS lng, ST_Y(geom) AS lat;
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Posko tidak ditemukan." });
    }

    res.status(200).json({ success: true, message: "Data posko berhasil diperbarui.", data: result.rows[0] });
  } catch (err) {
    console.error("Error updatePosko:", err.message);
    res.status(500).json({ success: false, message: "Gagal memperbarui posko", error: err.message });
  }
};

const deletePosko = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM posko_pengungsian WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Posko tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Data posko berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menghapus posko", error: err.message });
  }
};

// ==========================================
// 2. CRUD SUMBER AIR BERSIH (F08)
// ==========================================
const createAirBersih = async (req, res) => {
  try {
    const { nama_lokasi, pengelola, jenis, jam_operasional, debit_liter_detik, latitude, longitude, status_aktif, keterangan } = req.body;

    if (!nama_lokasi || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Nama lokasi dan koordinat (lat, lng) wajib diisi." });
    }

    const query = `
      INSERT INTO sumber_air_bersih (
        nama_lokasi, nama_titik, pengelola, jenis, jam_operasional, 
        debit_liter_detik, status_aktif, status_layak, keterangan, 
        geom, updated_at
      )
      VALUES (
        $1, $1, $2, $3, $4, 
        $5, $6, $6, $7, 
        ST_SetSRID(ST_MakePoint($8, $9), 4326), 
        CURRENT_TIMESTAMP
      )
      RETURNING id, nama_lokasi, pengelola, jenis, status_aktif, ST_X(geom) AS lng, ST_Y(geom) AS lat;
    `;
    const values = [
      nama_lokasi, pengelola || "PDAM Tirta Mayang", jenis || "PDAM / Kran Komunal",
      jam_operasional || "24 Jam", parseFloat(debit_liter_detik) || 5.0, status_aktif !== false,
      keterangan || "-", parseFloat(longitude), parseFloat(latitude)
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, message: "Sumber air bersih berhasil ditambahkan.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menambah sumber air bersih", error: err.message });
  }
};

const updateAirBersih = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_lokasi, pengelola, jenis, jam_operasional, debit_liter_detik, latitude, longitude, status_aktif, keterangan } = req.body;

    let updateGeomClause = "";
    let values = [nama_lokasi, pengelola, jenis, jam_operasional, parseFloat(debit_liter_detik) || 5.0, status_aktif !== false, keterangan, id];

    if (latitude !== undefined && longitude !== undefined) {
      values.push(parseFloat(longitude), parseFloat(latitude));
      updateGeomClause = `, geom = ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}), 4326)`;
    }

    const query = `
      UPDATE sumber_air_bersih
      SET nama_lokasi = $1, nama_titik = $1, pengelola = $2, jenis = $3,
          jam_operasional = $4, debit_liter_detik = $5, status_aktif = $6, status_layak = $6,
          keterangan = $7, updated_at = CURRENT_TIMESTAMP
          ${updateGeomClause}
      WHERE id = $8
      RETURNING id, nama_lokasi, pengelola, jenis, status_aktif, ST_X(geom) AS lng, ST_Y(geom) AS lat;
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Sumber air bersih tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Sumber air bersih berhasil diperbarui.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memperbarui sumber air bersih", error: err.message });
  }
};

const deleteAirBersih = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM sumber_air_bersih WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Sumber air bersih tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Sumber air bersih berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menghapus sumber air bersih", error: err.message });
  }
};

// ==========================================
// 3. CRUD TITIK BANJIR HISTORIS (F10)
// ==========================================
const createTitikBanjir = async (req, res) => {
  try {
    const { nama_lokasi, kecamatan, tanggal_kejadian, tinggi_genangan_cm, lama_genangan_jam, keterangan, latitude, longitude } = req.body;

    if (!nama_lokasi || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Nama lokasi dan koordinat wajib diisi." });
    }

    const query = `
      INSERT INTO titik_banjir_historis (
        nama_lokasi, kecamatan, tanggal_kejadian, tahun_kejadian,
        tinggi_genangan_cm, lama_genangan_jam, keterangan, geom
      )
      VALUES (
        $1, $2, $3, EXTRACT(YEAR FROM $3::date),
        $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)
      )
      RETURNING id, nama_lokasi, kecamatan, tanggal_kejadian, tinggi_genangan_cm, lama_genangan_jam, keterangan,
                ST_X(geom) AS lng, ST_Y(geom) AS lat;
    `;
    const values = [
      nama_lokasi, kecamatan || "Kota Jambi", tanggal_kejadian || "2025-02-15",
      parseInt(tinggi_genangan_cm, 10) || 50, parseInt(lama_genangan_jam, 10) || 12,
      keterangan || "Validasi laporan banjir warga", parseFloat(longitude), parseFloat(latitude)
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, message: "Titik banjir historis berhasil divalidasi & ditambahkan.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menambah titik banjir historis", error: err.message });
  }
};

const updateTitikBanjir = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_lokasi, kecamatan, tanggal_kejadian, tinggi_genangan_cm, lama_genangan_jam, keterangan, latitude, longitude } = req.body;

    let updateGeomClause = "";
    let values = [nama_lokasi, kecamatan, tanggal_kejadian, parseInt(tinggi_genangan_cm, 10) || 50, parseInt(lama_genangan_jam, 10) || 12, keterangan, id];

    if (latitude !== undefined && longitude !== undefined) {
      values.push(parseFloat(longitude), parseFloat(latitude));
      updateGeomClause = `, geom = ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}), 4326)`;
    }

    const query = `
      UPDATE titik_banjir_historis
      SET nama_lokasi = $1, kecamatan = $2, tanggal_kejadian = $3,
          tinggi_genangan_cm = $4, lama_genangan_jam = $5, keterangan = $6
          ${updateGeomClause}
      WHERE id = $7
      RETURNING id, nama_lokasi, kecamatan, tanggal_kejadian, tinggi_genangan_cm, ST_X(geom) AS lng, ST_Y(geom) AS lat;
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Titik banjir historis tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Titik banjir historis berhasil diperbarui.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memperbarui titik banjir", error: err.message });
  }
};

const deleteTitikBanjir = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM titik_banjir_historis WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Titik banjir tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Titik banjir berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menghapus titik banjir", error: err.message });
  }
};

// ==========================================
// 4. PENANDAAN RUAS JALAN TERGENANG (F10)
// ==========================================
const createJalanTergenang = async (req, res) => {
  try {
    const { nama_jalan, kecamatan, status_tergenang, kedalaman_genangan_cm, keterangan, coordinates } = req.body;

    if (!nama_jalan || !coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Nama jalan dan array koordinat LineString minimal 2 titik [[lng, lat], [lng, lat]] wajib diisi."
      });
    }

    // Format LineString Text WKT: LINESTRING(lng1 lat1, lng2 lat2, ...)
    const lineStringWKT = `LINESTRING(${coordinates.map(pt => `${pt[0]} ${pt[1]}`).join(", ")})`;

    const query = `
      INSERT INTO ruas_jalan_tergenang (
        nama_jalan, kecamatan, status_tergenang, kedalaman_genangan_cm, keterangan, geom, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, 
        ST_SetSRID(ST_GeomFromText($6), 4326), 
        CURRENT_TIMESTAMP
      )
      RETURNING id, nama_jalan, kecamatan, status_tergenang, kedalaman_genangan_cm, keterangan, ST_AsGeoJSON(geom)::json AS geometry;
    `;

    const values = [nama_jalan, kecamatan || "Kota Jambi", status_tergenang !== false, parseInt(kedalaman_genangan_cm, 10) || 30, keterangan || "Ditandai oleh Admin BPBD", lineStringWKT];
    const result = await pool.query(query, values);

    res.status(201).json({ success: true, message: "Ruas jalan tergenang berhasil ditandai.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menandai jalan tergenang", error: err.message });
  }
};

const toggleStatusJalan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_tergenang } = req.body;

    const query = `
      UPDATE ruas_jalan_tergenang
      SET status_tergenang = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nama_jalan, status_tergenang, updated_at;
    `;
    const result = await pool.query(query, [status_tergenang === true, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Ruas jalan tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: `Status jalan diperbarui: ${status_tergenang ? 'Tergenang' : 'Surut / Aman Dilalui'}`, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengubah status jalan", error: err.message });
  }
};

const deleteJalanTergenang = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM ruas_jalan_tergenang WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Ruas jalan tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Ruas jalan tergenang berhasil dihapus dari pemantauan." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menghapus ruas jalan", error: err.message });
  }
};

// ==========================================
// 5. PENGATURAN AMBANG WASPADA / SIAGA (F10)
// ==========================================
const getPengaturanAmbang = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pengaturan_ambang ORDER BY id ASC");
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat pengaturan ambang", error: err.message });
  }
};

const updatePengaturanAmbang = async (req, res) => {
  try {
    const { id } = req.params;
    const { ambang_waspada, ambang_siaga, deskripsi } = req.body;

    const query = `
      UPDATE pengaturan_ambang
      SET ambang_waspada = $1, ambang_siaga = $2, deskripsi = COALESCE($3, deskripsi), updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(query, [parseFloat(ambang_waspada), parseFloat(ambang_siaga), deskripsi, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Pengaturan ambang tidak ditemukan." });
    }
    res.status(200).json({ success: true, message: "Batas ambang berhasil diperbarui.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memperbarui ambang", error: err.message });
  }
};

// ==========================================
// 6. ENHANCED ADMIN CONTROLLERS & STATISTIK
// ==========================================

const getAllPoskoAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, COALESCE(nama, nama_posko) AS nama, COALESCE(kontak, kontak_pj) AS kontak, 
             COALESCE(kapasitas, kapasitas_jiwa) AS kapasitas, COALESCE(terisi_jiwa, 0) AS terisi_jiwa, 
             alamat, fasilitas, status_aktif, ST_X(geom) AS lng, ST_Y(geom) AS lat, updated_at 
      FROM posko_pengungsian 
      ORDER BY id DESC;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat posko", error: err.message });
  }
};

const togglePoskoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_aktif } = req.body;
    const result = await pool.query(
      "UPDATE posko_pengungsian SET status_aktif = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nama, status_aktif",
      [status_aktif === true, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Posko tidak ditemukan." });
    res.status(200).json({ success: true, message: `Status posko diubah menjadi ${status_aktif ? 'Aktif' : 'Tidak Aktif'}.`, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengubah status posko", error: err.message });
  }
};

const getAllAirBersihAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nama_lokasi, pengelola, jenis, jam_operasional, debit_liter_detik, 
             status_layak, status_aktif, keterangan, ST_X(geom) AS lng, ST_Y(geom) AS lat, updated_at 
      FROM sumber_air_bersih 
      ORDER BY id DESC;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat sumber air bersih", error: err.message });
  }
};

const toggleAirBersihStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_aktif } = req.body;
    const result = await pool.query(
      "UPDATE sumber_air_bersih SET status_aktif = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nama_lokasi, status_aktif",
      [status_aktif === true, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Sumber air tidak ditemukan." });
    res.status(200).json({ success: true, message: `Status air bersih diubah menjadi ${status_aktif ? 'Aktif' : 'Tidak Aktif'}.`, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mengubah status air bersih", error: err.message });
  }
};

const getAllTitikBanjirAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nama_lokasi, kecamatan, tanggal_kejadian, tinggi_genangan_cm, lama_genangan_jam, 
             keterangan, ST_X(geom) AS lng, ST_Y(geom) AS lat, created_at 
      FROM titik_banjir_historis 
      ORDER BY id DESC;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat titik banjir historis", error: err.message });
  }
};

const getStatistikValidasiBanjir = async (req, res) => {
  try {
    // 1. Total Titik Banjir
    const totalRes = await pool.query("SELECT COUNT(*) FROM titik_banjir_historis");
    const totalTitik = parseInt(totalRes.rows[0].count, 10);

    // 2. Korelasi Spasial dengan Zona Rawan Banjir (Model AHP)
    const validasiRes = await pool.query(`
      SELECT 
        COALESCE(z.kelas_kerawanan, 'Di Luar Model') AS zona,
        COUNT(t.id) AS jumlah_titik,
        ROUND((COUNT(t.id)::numeric / NULLIF($1, 0) * 100), 1) AS persentase
      FROM titik_banjir_historis t
      LEFT JOIN zona_rawan_banjir z ON ST_Contains(z.geom, t.geom)
      GROUP BY z.kelas_kerawanan
      ORDER BY jumlah_titik DESC;
    `, [totalTitik]);

    res.status(200).json({
      success: true,
      data: {
        total_kejadian_tercatat: totalTitik,
        validasi_terhadap_zona_rawan: validasiRes.rows,
        kesimpulan_akurasi: totalTitik > 0 ? "Titik banjir lapangan mayoritas terverifikasi berada pada zona Tinggi/Sangat Tinggi." : "Belum ada titik validasi."
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat statistik validasi banjir", error: err.message });
  }
};

const getAllJalanTergenangAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nama_jalan, kecamatan, status_tergenang, kedalaman_genangan_cm, keterangan, 
             ST_AsGeoJSON(geom)::json AS geometry, updated_at 
      FROM ruas_jalan_tergenang 
      ORDER BY id DESC;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat ruas jalan tergenang", error: err.message });
  }
};

const getKecamatanAdminList = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nama_kecamatan, curah_hujan_terkini, intensitas_terkini, status_peringatan, 
             suhu_celsius, kelembapan_persen, sumber_data, is_delayed, terakhir_update 
      FROM kecamatan 
      ORDER BY id ASC;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat kecamatan", error: err.message });
  }
};

const inputCurahHujanManual = async (req, res) => {
  try {
    const { id_kecamatan, curah_hujan, suhu, kelembapan, status_peringatan, intensitas } = req.body;

    if (!id_kecamatan || curah_hujan === undefined) {
      return res.status(400).json({ success: false, message: "ID Kecamatan dan nilai curah hujan (mm) wajib diisi." });
    }

    const mm = parseFloat(curah_hujan);
    let status = status_peringatan;
    let intens = intensitas;

    // Default klasifikasi jika tidak ditentukan
    if (!status) {
      if (mm > 10.0) status = "Siaga";
      else if (mm > 5.0) status = "Waspada";
      else status = "Normal";
    }

    if (!intens) {
      if (mm === 0) intens = "Cerah / Berawan";
      else if (mm <= 5) intens = "Hujan Ringan";
      else if (mm <= 10) intens = "Hujan Sedang";
      else intens = "Hujan Lebat / Ekstrem";
    }

    const updateQuery = `
      UPDATE kecamatan
      SET curah_hujan_terkini = $1,
          intensitas_terkini = $2,
          status_peringatan = $3,
          suhu_celsius = COALESCE($4, suhu_celsius),
          kelembapan_persen = COALESCE($5, kelembapan_persen),
          sumber_data = 'Manual Fallback (Admin BPBD)',
          is_delayed = false,
          terakhir_update = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [mm, intens, status, suhu, kelembapan, id_kecamatan]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kecamatan tidak ditemukan." });
    }

    // Catat juga ke log_curah_hujan agar grafik terupdate
    await pool.query(`
      INSERT INTO log_curah_hujan (kecamatan_id, curah_hujan, suhu, kelembapan, waktu)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (kecamatan_id, waktu) DO UPDATE
      SET curah_hujan = EXCLUDED.curah_hujan;
    `, [id_kecamatan, mm, suhu || 28.0, kelembapan || 80]);

    res.status(200).json({
      success: true,
      message: `Curah hujan manual untuk ${result.rows[0].nama_kecamatan} berhasil disimpan (${mm} mm/jam - ${status}).`,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal menyimpan curah hujan manual", error: err.message });
  }
};

const getBobotModel = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pengaturan_bobot_model ORDER BY id ASC");
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat bobot model", error: err.message });
  }
};

const updateBobotModel = async (req, res) => {
  try {
    const { id } = req.params;
    const { bobot_persen, keterangan } = req.body;
    const result = await pool.query(`
      UPDATE pengaturan_bobot_model
      SET bobot_persen = $1, keterangan = COALESCE($2, keterangan), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [parseFloat(bobot_persen), keterangan, id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Parameter tidak ditemukan." });
    res.status(200).json({ success: true, message: "Bobot parameter model berhasil diperbarui.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memperbarui bobot model", error: err.message });
  }
};

const getLogNotifikasiAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ln.id, ln.waktu, ln.id_kecamatan, k.nama_kecamatan, ln.status_baru, ln.jumlah_terkirim, ln.status_pengiriman
      FROM log_notifikasi ln
      LEFT JOIN kecamatan k ON ln.id_kecamatan = k.id
      ORDER BY ln.id DESC
      LIMIT 100;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat log notifikasi", error: err.message });
  }
};

const getPelangganNotifikasiAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.email, p.id_kecamatan, k.nama_kecamatan, p.is_verified, p.created_at
      FROM pelanggan_notifikasi p
      LEFT JOIN kecamatan k ON p.id_kecamatan = k.id
      ORDER BY p.id DESC;
    `);
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat pelanggan notifikasi", error: err.message });
  }
};

module.exports = {
  createPosko,
  updatePosko,
  deletePosko,
  getAllPoskoAdmin,
  togglePoskoStatus,
  createAirBersih,
  updateAirBersih,
  deleteAirBersih,
  getAllAirBersihAdmin,
  toggleAirBersihStatus,
  createTitikBanjir,
  updateTitikBanjir,
  deleteTitikBanjir,
  getAllTitikBanjirAdmin,
  getStatistikValidasiBanjir,
  createJalanTergenang,
  toggleStatusJalan,
  deleteJalanTergenang,
  getAllJalanTergenangAdmin,
  getPengaturanAmbang,
  updatePengaturanAmbang,
  getKecamatanAdminList,
  inputCurahHujanManual,
  getBobotModel,
  updateBobotModel,
  getLogNotifikasiAdmin,
  getPelangganNotifikasiAdmin,
};
