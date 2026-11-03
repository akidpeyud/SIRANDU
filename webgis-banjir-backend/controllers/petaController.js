const pool = require("../config/db");

/**
 * F01: Mengambil Batas Wilayah Administrasi (Kelurahan/Kecamatan)
 * Output: GeoJSON FeatureCollection (MultiPolygon)
 * Mendukung filter ?kecamatan=Alam+Barajo
 */
const getBatasAdministrasi = async (req, res) => {
  try {
    const { kecamatan, status } = req.query;
    let conditions = [];
    let values = [];

    if (kecamatan && kecamatan !== "Semua") {
      values.push(kecamatan);
      conditions.push(`LOWER(nama_kecamatan) = LOWER($${values.length})`);
    }

    if (status) {
      values.push(status);
      conditions.push(`status_siaga = $${values.length}`);
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
                'kode_wilayah', kode_wilayah,
                'nama_kecamatan', nama_kecamatan,
                'nama_kelurahan', nama_kelurahan,
                'status_siaga', status_siaga,
                'warna_wilayah', COALESCE(warna_wilayah, '#3b82f6'),
                'ambang_waspada', ambang_hujan_waspada,
                'ambang_siaga', ambang_hujan_siaga
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM wilayah_administrasi
      ${whereClause};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getBatasAdministrasi:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data batas wilayah administrasi",
      error: err.message,
    });
  }
};

/**
 * LAYER 2: Ketinggian Tanah DEMNAS (Klasifikasi Rendah, Sedang, Tinggi)
 */
const getElevasiGeoJSON = async (req, res) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          json_agg(
            json_build_object(
              'type', 'Feature',
              'id', z.id,
              'geometry', ST_AsGeoJSON(z.geom)::json,
              'properties', json_build_object(
                'id', z.id,
                'kecamatan', w.nama_kecamatan,
                'kelurahan', w.nama_kelurahan,
                'kelas_elevasi', z.kelas_elevasi,
                'rata_elevasi_mdpl', z.rata_elevasi_mdpl,
                'warna_elevasi', CASE z.kelas_elevasi
                  WHEN 'Rendah' THEN '#ef4444'   -- < 12 mdpl (Cekungan Rawan Luapan)
                  WHEN 'Sedang' THEN '#f59e0b'   -- 12 - 25 mdpl
                  ELSE '#10b981'                 -- > 25 mdpl (Dataran Tinggi Aman)
                END,
                'keterangan', CASE z.kelas_elevasi
                  WHEN 'Rendah' THEN 'Elevasi Rendah (< 12 mdpl) - Cekungan Alami'
                  WHEN 'Sedang' THEN 'Elevasi Sedang (12 - 25 mdpl) - Pemukiman Terkendali'
                  ELSE 'Elevasi Tinggi (> 25 mdpl) - Topografi Bebas Genangan'
                END
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM zona_rawan_banjir z
      LEFT JOIN wilayah_administrasi w ON z.wilayah_id = w.id;
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getElevasiGeoJSON:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * LAYER 3: Aliran Sungai Batanghari & Zona Buffer Bahaya Bergradasi
 * Multi-ring buffer PostGIS:
 * - 150m: Bahaya Ekstrem (Merah #dc2626)
 * - 400m: Siaga Luapan (Oranye #ea580c)
 * - 800m: Waspada Genangan (Kuning #eab308)
 * - Garis Aliran Sungai (Biru #0284c7)
 */
const getSungaiDanBuffer = async (req, res) => {
  try {
    // 1. Ambil Garis Sungai
    const qGarisSungai = `
      SELECT json_agg(
        json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::json,
          'properties', json_build_object(
            'nama_sungai', nama_sungai,
            'tipe', tipe,
            'kategori_layer', 'garis_sungai',
            'warna', '#0284c7',
            'weight', CASE WHEN tipe = 'Sungai Utama' THEN 5 ELSE 3 END
          )
        )
      ) AS features FROM sungai_kota_jambi;
    `;

    // 2. Multi-Ring Buffer Bergradasi untuk Sungai Batanghari
    const qBuffer = `
      WITH merged_sungai AS (
        SELECT ST_Union(geom) AS geom FROM sungai_kota_jambi WHERE tipe = 'Sungai Utama'
      )
      SELECT json_agg(
        json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(buffer_geom)::json,
          'properties', json_build_object(
            'zona_buffer', zona_label,
            'jarak_meter', radius_meter,
            'tingkat_bahaya', tingkat_bahaya,
            'warna', warna,
            'fill_opacity', fill_opacity,
            'kategori_layer', 'buffer_sungai'
          )
        )
      ) AS features
      FROM (
        -- Ring 3: 800m (Waspada Genangan)
        SELECT 800 AS radius_meter, 'Radius 800m (Waspada Genangan Pasang)' AS zona_label, 'Waspada' AS tingkat_bahaya, 
               '#eab308' AS warna, 0.20 AS fill_opacity,
               ST_Buffer(geom::geography, 800)::geometry AS buffer_geom FROM merged_sungai
        UNION ALL
        -- Ring 2: 400m (Siaga Luapan Sungai)
        SELECT 400 AS radius_meter, 'Radius 400m (Siaga Luapan Batanghari)' AS zona_label, 'Siaga' AS tingkat_bahaya, 
               '#ea580c' AS warna, 0.35 AS fill_opacity,
               ST_Buffer(geom::geography, 400)::geometry AS buffer_geom FROM merged_sungai
        UNION ALL
        -- Ring 1: 150m (Bahaya Ekstrem Bantaran)
        SELECT 150 AS radius_meter, 'Radius 150m (Zona Bahaya Ekstrem Bantaran)' AS zona_label, 'Bahaya' AS tingkat_bahaya, 
               '#dc2626' AS warna, 0.50 AS fill_opacity,
               ST_Buffer(geom::geography, 150)::geometry AS buffer_geom FROM merged_sungai
      ) sub;
    `;

    const resGaris = await pool.query(qGarisSungai);
    const resBuffer = await pool.query(qBuffer);

    const fGaris = resGaris.rows[0].features || [];
    const fBuffer = resBuffer.rows[0].features || [];

    // Urutan: Buffer Terluar (800m), Tengah (400m), Terdalam (150m), lalu Garis Sungai di paling atas
    const allFeatures = [...fBuffer, ...fGaris];

    res.status(200).json({
      type: "FeatureCollection",
      features: allFeatures,
    });
  } catch (err) {
    console.error("Error getSungaiDanBuffer:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * F01: Pencarian Cepat Lokasi Kelurahan / Kecamatan (Search Box Autocomplete)
 */
const searchWilayah = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Parameter q minimal 2 karakter",
      });
    }

    const query = `
      SELECT 
        id, kode_wilayah, nama_kecamatan, nama_kelurahan, status_siaga,
        ST_Y(ST_Centroid(geom)) AS latitude_tengah,
        ST_X(ST_Centroid(geom)) AS longitude_tengah
      FROM wilayah_administrasi
      WHERE nama_kelurahan ILIKE $1 OR nama_kecamatan ILIKE $1
      ORDER BY nama_kelurahan ASC
      LIMIT 10;
    `;

    const result = await pool.query(query, [`%${q}%`]);
    res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    console.error("Error searchWilayah:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mencari wilayah",
      error: err.message,
    });
  }
};

/**
 * F02 & F03: Mengambil Layer Poligon 5 Kelas Kerawanan Banjir & Elevasi DEMNAS
 */
const getZonaRawanGeoJSON = async (req, res) => {
  try {
    const { tingkat } = req.query;
    let filter = "";
    let values = [];

    if (tingkat) {
      values.push(tingkat);
      filter = `WHERE z.tingkat_rawan = $1`;
    }

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          json_agg(
            json_build_object(
              'type', 'Feature',
              'id', z.id,
              'geometry', ST_AsGeoJSON(z.geom)::json,
              'properties', json_build_object(
                'id', z.id,
                'kelurahan', w.nama_kelurahan,
                'kecamatan', w.nama_kecamatan,
                'tingkat_rawan', z.tingkat_rawan,
                'skor_total', z.skor_total,
                'kelas_elevasi', z.kelas_elevasi,
                'rata_elevasi_mdpl', z.rata_elevasi_mdpl,
                'faktor_penyebab', z.faktor_penyebab_utama,
                'warna_hex', CASE z.tingkat_rawan
                  WHEN 'Sangat Tinggi' THEN '#990000'
                  WHEN 'Tinggi' THEN '#e11d48'
                  WHEN 'Sedang' THEN '#f59e0b'
                  WHEN 'Rendah' THEN '#84cc16'
                  ELSE '#10b981'
                END
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM zona_rawan_banjir z
      LEFT JOIN wilayah_administrasi w ON z.wilayah_id = w.id
      ${filter};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getZonaRawanGeoJSON:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil layer zona rawan banjir",
      error: err.message,
    });
  }
};

/**
 * F02: Cek Risiko Banjir Lokasi Pengguna (Point-in-Polygon PostGIS)
 */
const cekRisikoLokasi = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude dan Longitude wajib dikirim dalam request body!",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Format koordinat latitude / longitude tidak valid!",
      });
    }

    const query = `
      SELECT 
        w.id AS wilayah_id,
        w.nama_kecamatan,
        w.nama_kelurahan,
        w.status_siaga,
        COALESCE(z.tingkat_rawan, 'Sangat Rendah') AS tingkat_rawan,
        COALESCE(z.skor_total, 15.0) AS skor_total,
        COALESCE(z.kelas_elevasi, 'Sedang') AS kelas_elevasi,
        COALESCE(z.rata_elevasi_mdpl, 15.0) AS rata_elevasi_mdpl,
        COALESCE(z.faktor_penyebab_utama, 'Lokasi berada di luar zona bahaya utama atau elevasi aman dari luapan sungai.') AS faktor_penyebab_utama
      FROM wilayah_administrasi w
      LEFT JOIN zona_rawan_banjir z 
        ON ST_Contains(z.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      WHERE ST_Contains(w.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1;
    `;

    const result = await pool.query(query, [lng, lat]);

    let item;
    if (result.rows.length > 0) {
      item = result.rows[0];
    } else {
      // Fallback Adaptif: Cari kecamatan terdekat dalam wilayah Kota Jambi (maksimum radius 15 km)
      const qFallback = `
        SELECT 
          k.id AS wilayah_id,
          k.nama_kecamatan,
          k.nama_kecamatan || ' (Area Pemukiman)' AS nama_kelurahan,
          k.status_peringatan AS status_siaga,
          CASE 
            WHEN k.curah_hujan_terkini > 10 THEN 'Tinggi'
            WHEN k.curah_hujan_terkini > 5 THEN 'Sedang'
            ELSE 'Rendah'
          END AS tingkat_rawan,
          35.0 AS skor_total,
          'Sedang' AS kelas_elevasi,
          16.0 AS rata_elevasi_mdpl,
          'Wilayah terpantau dalam cakupan Kecamatan ' || k.nama_kecamatan || '. Status kerawanan dipengaruhi drainase lingkungan lokal.' AS faktor_penyebab_utama,
          ROUND(ST_Distance(k.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS dist_meter
        FROM kecamatan k
        ORDER BY dist_meter ASC
        LIMIT 1;
      `;
      const resFallback = await pool.query(qFallback, [lng, lat]);

      if (resFallback.rows.length > 0 && resFallback.rows[0].dist_meter <= 15000) {
        item = resFallback.rows[0];
      } else {
        return res.status(200).json({
          success: true,
          tercakup_layanan: false,
          message: "Koordinat berada di luar wilayah administratif Kota Jambi yang terpantau SIRANDU.",
          data: null,
        });
      }
    }

    let panduanAksi = "Kondisi lingkungan terpantau aman. Tetap jaga kebersihan drainase sekitar rumah.";
    let badgeColor = "#10b981";

    if (item.tingkat_rawan === "Sangat Tinggi") {
      panduanAksi = "🚨 ZONA MERAH KRITIS! Wilayah ini sangat rawan luapan langsung Sungai Batanghari. Segera cek posko evakuasi terdekat dan amankan barang berharga.";
      badgeColor = "#990000";
    } else if (item.tingkat_rawan === "Tinggi") {
      panduanAksi = "⚠️ ZONA RAWAN TINGGI! Siapkan tas siaga bencana, perhatikan ketinggian muka air saat hujan lebat berturut-turut.";
      badgeColor = "#e11d48";
    } else if (item.tingkat_rawan === "Sedang") {
      panduanAksi = "⚡ ZONA WASPADA GENANGAN! Berpotensi timbul genangan air setinggi 10-30 cm jika curah hujan ekstrem.";
      badgeColor = "#f59e0b";
    }

    res.status(200).json({
      success: true,
      tercakup_layanan: true,
      data: {
        lokasi: {
          kecamatan: item.nama_kecamatan,
          kelurahan: item.nama_kelurahan,
          status_siaga_kelurahan: item.status_siaga,
        },
        analisis_risiko: {
          tingkat_rawan: item.tingkat_rawan,
          skor_risiko: parseFloat(item.skor_total),
          warna_badge: badgeColor,
          kelas_elevasi: item.kelas_elevasi,
          rata_elevasi_mdpl: parseFloat(item.rata_elevasi_mdpl),
          faktor_penyebab: item.faktor_penyebab_utama,
        },
        panduan_mitigasi: panduanAksi,
      },
    });
  } catch (err) {
    console.error("Error cekRisikoLokasi:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal memproses analisis spasial lokasi",
      error: err.message,
    });
  }
};

module.exports = {
  getBatasAdministrasi,
  getElevasiGeoJSON,
  getSungaiDanBuffer,
  searchWilayah,
  getZonaRawanGeoJSON,
  cekRisikoLokasi,
};
