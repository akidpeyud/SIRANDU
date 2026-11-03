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
        'metadata', json_build_object(
          'sumber_data', 'Peta Administrasi Resmi Kota Jambi (Bappeda / SIMERAHKOJA)',
          'terakhir_update', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
          'total_wilayah', COUNT(*)
        ),
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
 * F03: Klasifikasi Ketinggian Tanah DEMNAS (Rendah, Sedang, Tinggi)
 * Output: GeoJSON FeatureCollection lengkap dengan metadata DEMNAS
 */
const getElevasiGeoJSON = async (req, res) => {
  try {
    const { kelas, kecamatan } = req.query;
    let conditions = [];
    let values = [];

    if (kelas) {
      values.push(kelas);
      conditions.push(`LOWER(kelas_elevasi) = LOWER($${values.length})`);
    }

    if (kecamatan && kecamatan !== "Semua") {
      values.push(kecamatan);
      conditions.push(`LOWER(kecamatan) = LOWER($${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'metadata', json_build_object(
          'sumber_data', 'DEMNAS Badan Informasi Geospasial (BIG)',
          'resolusi_spasial', '0.27 arc-second (~8.1 meter)',
          'datum_vertikal', 'EGM2008 Geoid',
          'terakhir_update', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS'),
          'klasifikasi_topografi', json_build_object(
            'rendah', '< 12 mdpl (Cekungan Rawan Luapan Sungai & Danau)',
            'sedang', '12 - 25 mdpl (Dataran Pemukiman Terkendali)',
            'tinggi', '> 25 mdpl (Punggung Bukit Bebas Banjir)'
          )
        ),
        'features', COALESCE(
          json_agg(
            json_build_object(
              'type', 'Feature',
              'id', id,
              'geometry', ST_AsGeoJSON(geom)::json,
              'properties', json_build_object(
                'id', id,
                'nama_wilayah', nama_wilayah,
                'kecamatan', kecamatan,
                'kelas_elevasi', kelas_elevasi,
                'rentang_mdpl', rentang_mdpl,
                'rata_elevasi_mdpl', rata_elevasi_mdpl,
                'warna_hex', warna_hex,
                'deskripsi_topografi', deskripsi_topografi,
                'rekomendasi_tata_ruang', rekomendasi_tata_ruang,
                'sumber_data', sumber_data
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM klasifikasi_elevasi
      ${whereClause};
    `;

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0].geojson);
  } catch (err) {
    console.error("Error getElevasiGeoJSON:", err.message);
    res.status(500).json({ success: false, message: "Gagal mengambil data elevasi DEMNAS", error: err.message });
  }
};

/**
 * F02: Layer Zona Rawan Banjir 5 Kelas (AHP 6 Parameter Berbobot Proposal SIRANDU)
 * Bobot: Tata guna lahan 19.3%, Jarak sungai 19.3%, Elevasi DEMNAS 17.0%,
 *        Curah hujan 17.0%, Drainase 14.8%, Kepadatan permukiman 12.5%
 */
const getZonaRawanGeoJSON = async (req, res) => {
  try {
    const { kelas, kecamatan } = req.query;
    let conditions = [];
    let values = [];

    if (kelas) {
      values.push(kelas);
      conditions.push(`LOWER(kelas_kerawanan) = LOWER($${values.length})`);
    }

    if (kecamatan && kecamatan !== "Semua") {
      values.push(kecamatan);
      conditions.push(`LOWER(kecamatan) = LOWER($${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'metadata', json_build_object(
          'sumber_data', 'Model Spatial Multi-Criteria Analysis (AHP) SIRANDU & Bappeda Kota Jambi',
          'model_pembobotan', json_build_object(
            'tata_guna_lahan_persen', 19.3,
            'jarak_sungai_persen', 19.3,
            'elevasi_demnas_persen', 17.0,
            'curah_hujan_bmkg_persen', 17.0,
            'kondisi_drainase_persen', 14.8,
            'kepadatan_permukiman_persen', 12.5
          ),
          'skala_kelas', json_build_object(
            '1_sangat_rendah', '< 35.0 (Hijau)',
            '2_rendah', '35.0 - 49.9 (Kuning)',
            '3_sedang', '50.0 - 64.9 (Oranye)',
            '4_tinggi', '65.0 - 80.0 (Merah)',
            '5_sangat_tinggi', '> 80.0 (Merah Tua / Marun)'
          ),
          'terakhir_update', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
        ),
        'features', COALESCE(
          json_agg(
            json_build_object(
              'type', 'Feature',
              'id', z.id,
              'geometry', ST_AsGeoJSON(z.geom)::json,
              'properties', json_build_object(
                'id', z.id,
                'nama_zona', z.nama_zona,
                'kecamatan', z.kecamatan,
                'kelas_kerawanan', z.kelas_kerawanan,
                'tingkat_kerawanan_angka', z.tingkat_kerawanan_angka,
                'skor_total', z.skor_total,
                'warna_hex', z.warna_hex,
                'rincian_skor_faktor', json_build_object(
                  'tata_guna_lahan_bobot_19_3', z.skor_tata_guna_lahan,
                  'jarak_sungai_bobot_19_3', z.skor_jarak_sungai,
                  'elevasi_demnas_bobot_17_0', z.skor_elevasi,
                  'curah_hujan_bobot_17_0', z.skor_curah_hujan,
                  'drainase_bobot_14_8', z.skor_drainase,
                  'kepadatan_permukiman_bobot_12_5', z.skor_kepadatan_permukiman
                ),
                'kelas_elevasi', z.kelas_elevasi,
                'rata_elevasi_mdpl', z.rata_elevasi_mdpl,
                'faktor_penyebab_utama', z.faktor_penyebab_utama,
                'rekomendasi_mitigasi', z.rekomendasi_mitigasi,
                'sumber_data', z.sumber_data
              )
            )
          ),
          '[]'::json
        )
      ) AS geojson
      FROM zona_rawan_banjir z
      ${whereClause};
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
 * LAYER 3: Aliran Sungai Batanghari & Multi-Ring Buffer Bahaya Bergradasi
 */
const getSungaiDanBuffer = async (req, res) => {
  try {
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
        SELECT 800 AS radius_meter, 'Radius 800m (Waspada Genangan Pasang)' AS zona_label, 'Waspada' AS tingkat_bahaya, 
               '#eab308' AS warna, 0.20 AS fill_opacity,
               ST_Buffer(geom::geography, 800)::geometry AS buffer_geom FROM merged_sungai
        UNION ALL
        SELECT 400 AS radius_meter, 'Radius 400m (Siaga Luapan Batanghari)' AS zona_label, 'Siaga' AS tingkat_bahaya, 
               '#ea580c' AS warna, 0.35 AS fill_opacity,
               ST_Buffer(geom::geography, 400)::geometry AS buffer_geom FROM merged_sungai
        UNION ALL
        SELECT 150 AS radius_meter, 'Radius 150m (Bahaya Ekstrem Bantaran Sungai)' AS zona_label, 'Bahaya' AS tingkat_bahaya, 
               '#dc2626' AS warna, 0.50 AS fill_opacity,
               ST_Buffer(geom::geography, 150)::geometry AS buffer_geom FROM merged_sungai
      ) sub;
    `;

    const resGaris = await pool.query(qGarisSungai);
    const resBuffer = await pool.query(qBuffer);

    const featuresGaris = resGaris.rows[0].features || [];
    const featuresBuffer = resBuffer.rows[0].features || [];

    res.status(200).json({
      type: "FeatureCollection",
      metadata: {
        sumber_data: "BWS Sumatera VI & Analisis Buffer PostGIS SIRANDU",
        buffer_klasifikasi: "150m (Bahaya Ekstrem), 400m (Siaga Luapan), 800m (Waspada Genangan)"
      },
      features: [...featuresBuffer, ...featuresGaris],
    });
  } catch (err) {
    console.error("Error getSungaiDanBuffer:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * FITUR ANDALAN F02: Cek Lokasi Pengguna (Point-in-Polygon PostGIS)
 * Mendukung GET /api/cek-lokasi?lat=...&lng=... dan POST /api/peta/cek-lokasi
 * PRIVACY POLICY: Koordinat pengguna hanya diproses in-memory dan TIDAK disimpan ke database.
 */
const cekRisikoLokasi = async (req, res) => {
  try {
    const latParam = req.query.lat || req.query.latitude || req.body?.latitude || req.body?.lat;
    const lngParam = req.query.lng || req.query.longitude || req.body?.longitude || req.body?.lng;

    if (latParam === undefined || lngParam === undefined) {
      return res.status(400).json({
        success: false,
        message: "Koordinat latitude (lat) dan longitude (lng) wajib dikirimkan!",
      });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Format koordinat latitude / longitude tidak valid!",
      });
    }

    // Query Spatial Multi-Layer PostGIS
    // 1. Wilayah Administrasi (ST_Contains)
    // 2. Zona Rawan Banjir 5 Kelas (ST_Contains)
    // 3. Elevasi DEMNAS (ST_Contains)
    // 4. Status Cuaca Terkini Kecamatan (Join by name)
    const spatialQuery = `
      SELECT 
        w.id AS wilayah_id,
        w.nama_kecamatan,
        w.nama_kelurahan,
        w.status_siaga,
        -- Data Zona Rawan Banjir (F02)
        COALESCE(z.kelas_kerawanan, 'Sedang') AS kelas_kerawanan,
        COALESCE(z.tingkat_kerawanan_angka, 3) AS tingkat_kerawanan_angka,
        COALESCE(z.skor_total, 50.0) AS skor_total,
        COALESCE(z.warna_hex, '#f97316') AS warna_badge_rawan,
        COALESCE(z.faktor_penyebab_utama, 'Lokasi dipengaruhi oleh kondisi drainase lingkungan dan intensitas curah hujan lokal.') AS faktor_penyebab_utama,
        COALESCE(z.rekomendasi_mitigasi, 'Pantau terus informasi peringatan dini cuaca SIRANDU.') AS rekomendasi_mitigasi,
        -- Rincian 6 Parameter AHP
        json_build_object(
          'tata_guna_lahan', COALESCE(z.skor_tata_guna_lahan, 12.0),
          'jarak_sungai', COALESCE(z.skor_jarak_sungai, 12.0),
          'elevasi_demnas', COALESCE(z.skor_elevasi, 12.0),
          'curah_hujan', COALESCE(z.skor_curah_hujan, 12.0),
          'drainase', COALESCE(z.skor_drainase, 8.0),
          'kepadatan_permukiman', COALESCE(z.skor_kepadatan_permukiman, 6.0)
        ) AS rincian_faktor_ahp,
        -- Data Elevasi DEMNAS (F03)
        COALESCE(e.kelas_elevasi, 'Sedang') AS kelas_elevasi,
        COALESCE(e.rentang_mdpl, '12 - 25 mdpl') AS rentang_mdpl,
        COALESCE(e.rata_elevasi_mdpl, 16.0) AS rata_elevasi_mdpl,
        COALESCE(e.deskripsi_topografi, 'Dataran pemukiman sedang') AS deskripsi_topografi,
        -- Data Cuaca Terkini Kecamatan Terkait (F04 & F05)
        COALESCE(k.curah_hujan_terkini, 0.0) AS curah_hujan_terkini,
        COALESCE(k.intensitas_terkini, 'Berawan / Tidak Hujan') AS intensitas_cuaca_terkini,
        COALESCE(k.status_peringatan, 'Normal') AS status_peringatan_cuaca,
        COALESCE(k.suhu_celsius, 28.0) AS suhu_celsius,
        COALESCE(k.kelembapan_persen, 80) AS kelembapan_persen,
        COALESCE(k.is_delayed, false) AS is_delayed_cuaca
      FROM wilayah_administrasi w
      LEFT JOIN zona_rawan_banjir z 
        ON ST_Contains(z.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LEFT JOIN klasifikasi_elevasi e 
        ON ST_Contains(e.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LEFT JOIN kecamatan k 
        ON LOWER(k.nama_kecamatan) = LOWER(w.nama_kecamatan)
      WHERE ST_Contains(w.geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
      LIMIT 1;
    `;

    const result = await pool.query(spatialQuery, [lng, lat]);

    if (result.rows.length === 0) {
      // Cek apakah dalam radius buffer 15km Kota Jambi untuk fallback
      const qFallback = `
        SELECT 
          k.id, k.nama_kecamatan,
          k.curah_hujan_terkini, k.intensitas_terkini, k.status_peringatan,
          ROUND(ST_Distance(k.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS jarak_ke_centroid_meter
        FROM kecamatan k
        ORDER BY jarak_ke_centroid_meter ASC
        LIMIT 1;
      `;
      const resFallback = await pool.query(qFallback, [lng, lat]);

      if (resFallback.rows.length === 0 || resFallback.rows[0].jarak_ke_centroid_meter > 15000) {
        return res.status(200).json({
          success: true,
          tercakup_layanan: false,
          message: "Koordinat berada di luar wilayah administratif Kota Jambi yang terpantau SIRANDU.",
          data: null,
        });
      }
    }

    const item = result.rows[0];

    return res.status(200).json({
      success: true,
      tercakup_layanan: true,
      message: "Analisis risiko spasial lokasi berhasil dihitung secara real-time.",
      data: {
        wilayah: {
          kecamatan: item.nama_kecamatan,
          kelurahan: item.nama_kelurahan,
          nama_kelurahan: item.nama_kelurahan,
          status_siaga_administrasi: item.status_siaga,
        },
        risiko_banjir: {
          kelas_kerawanan: item.kelas_kerawanan,
          tingkat_angka: item.tingkat_kerawanan_angka, // 1 (Sangat Rendah) s/d 5 (Sangat Tinggi)
          skor_total: parseFloat(item.skor_total),
          warna_badge: item.warna_badge_rawan,
          faktor_penyebab_utama: item.faktor_penyebab_utama,
          rincian_skor_faktor_ahp: item.rincian_faktor_ahp,
        },
        topografi_demnas: {
          kelas_elevasi: item.kelas_elevasi,
          rentang_ketinggian: item.rentang_mdpl,
          rata_elevasi_mdpl: parseFloat(item.rata_elevasi_mdpl),
          deskripsi: item.deskripsi_topografi,
          sumber: "DEMNAS Badan Informasi Geospasial",
        },
        pantauan_cuaca_terkini: {
          curah_hujan_mm_jam: parseFloat(item.curah_hujan_terkini),
          intensitas_bmkg: item.intensitas_cuaca_terkini,
          status_peringatan: item.status_peringatan_cuaca, // Normal / Waspada / Siaga
          suhu_celsius: parseFloat(item.suhu_celsius),
          kelembapan_persen: item.kelembapan_persen,
          is_delayed: item.is_delayed_cuaca,
        },
        rekomendasi_dan_mitigasi: item.rekomendasi_mitigasi,
        kebijakan_privasi: "Koordinat lokasi diproses in-flight secara spasial dan tidak disimpan ke database log server.",
      },
    });
  } catch (err) {
    console.error("Error cekRisikoLokasi:", err.message);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan internal saat menganalisis lokasi",
      error: err.message,
    });
  }
};

const searchWilayah = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res.status(400).json({ success: false, message: "Parameter pencarian 'q' wajib diisi" });
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
    res.status(200).json({ success: true, total: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal mencari wilayah", error: err.message });
  }
};

module.exports = {
  getBatasAdministrasi,
  getElevasiGeoJSON,
  getZonaRawanGeoJSON,
  getSungaiDanBuffer,
  searchWilayah,
  cekRisikoLokasi,
};
