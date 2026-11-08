/**
 * Impor layer poligon/garis dari file (GeoJSON hasil olahan frontend: GeoJSON, KML, GPX, Shapefile .zip).
 * Dipanggil oleh panel admin React (#/admin/impor). Semua rute di belakang verifyToken.
 *
 * POST /api/admin/import/:layer   body: { features: [GeoJSON Feature], mode: 'append' | 'replace' }
 *   layer = zona | elevasi | sungai | batas
 *   - zona, elevasi, sungai: 'replace' menghapus isi tabel dulu (dalam satu transaksi).
 *   - batas: selalu upsert per (nama_kecamatan, nama_kelurahan). TIDAK pernah menghapus,
 *     karena wilayah_administrasi dirujuk tabel lain dengan ON DELETE CASCADE
 *     (pelanggan notifikasi, zona, pemantauan cuaca, dll).
 * GET  /api/admin/import/summary  → jumlah baris tiap layer.
 *
 * Setiap fitur memakai SAVEPOINT: satu fitur gagal tidak membatalkan fitur lain,
 * kecuali seluruh impor gagal (mis. mode replace lalu semua fitur ditolak) → ROLLBACK.
 */
const pool = require("../config/db");

const KELAS_RAWAN = ["Sangat Rendah", "Rendah", "Sedang", "Tinggi", "Sangat Tinggi"];
const WARNA_RAWAN = { "Sangat Rendah": "#22c55e", Rendah: "#84cc16", Sedang: "#f59e0b", Tinggi: "#f97316", "Sangat Tinggi": "#dc2626" };
const KELAS_ELEV = ["Rendah", "Sedang", "Tinggi"];
const WARNA_ELEV = { Rendah: "#0ea5e9", Sedang: "#14b8a6", Tinggi: "#84cc16" };

const num = (v, d = null) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? d : Number(v));
const str = (v, d = null) => (v === undefined || v === null || String(v).trim() === "" ? d : String(v).trim());
const pickClass = (v, list, d) => {
  const s = String(v || "").trim().toLowerCase();
  return list.find((k) => k.toLowerCase() === s) || d;
};

// geometri GeoJSON → MultiPolygon 4326 valid
const POLY = "ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($GEOM), 4326)), 3))";
// wilayah yang memuat titik tengah poligon
const WIL_OF = (g) => `(SELECT w.id FROM wilayah_administrasi w WHERE ST_Intersects(w.geom, ST_PointOnSurface(${g})) LIMIT 1)`;
const KEC_OF = (g) => `(SELECT w.nama_kecamatan FROM wilayah_administrasi w WHERE ST_Intersects(w.geom, ST_PointOnSurface(${g})) LIMIT 1)`;

const LAYERS = {
  zona: {
    table: "zona_rawan_banjir",
    replaceable: true,
    async insert(client, f) {
      const p = f.properties || {};
      const kelas = pickClass(p.kelas_kerawanan ?? p.tingkat_rawan ?? p.kelas, KELAS_RAWAN, "Sedang");
      const g = POLY.replace("$GEOM", "$1");
      const q = `
        WITH src AS (SELECT ${g} AS geom)
        INSERT INTO zona_rawan_banjir (
          wilayah_id, nama_zona, kecamatan, tingkat_rawan, kelas_kerawanan, tingkat_kerawanan_angka, warna_hex,
          skor_total, kelas_elevasi, rata_elevasi_mdpl, faktor_penyebab_utama, rekomendasi_mitigasi, sumber_data,
          skor_tata_guna_lahan, skor_jarak_sungai, skor_elevasi, skor_curah_hujan, skor_drainase, skor_kepadatan_permukiman,
          geom, updated_at)
        SELECT ${WIL_OF("src.geom")}, $2, COALESCE($3, ${KEC_OF("src.geom")}, 'Kota Jambi'), $4, $4, $5, $6,
               $7, $8, $9, $10, $11, $12,
               COALESCE($13, 15), COALESCE($14, 15), COALESCE($15, 12), COALESCE($16, 12), COALESCE($17, 10), COALESCE($18, 8),
               src.geom, CURRENT_TIMESTAMP
        FROM src WHERE NOT ST_IsEmpty(src.geom)
        RETURNING id;`;
      const r = await client.query(q, [
        JSON.stringify(f.geometry), str(p.nama_zona ?? p.nama, `Zona ${kelas}`), str(p.kecamatan), kelas,
        KELAS_RAWAN.indexOf(kelas) + 1, str(p.warna_hex, WARNA_RAWAN[kelas]),
        num(p.skor_total ?? p.skor, (KELAS_RAWAN.indexOf(kelas) + 1) * 20),
        pickClass(p.kelas_elevasi, KELAS_ELEV, "Sedang"), num(p.rata_elevasi_mdpl, 15),
        str(p.faktor_penyebab_utama ?? p.penyebab), str(p.rekomendasi_mitigasi ?? p.mitigasi), str(p.sumber_data, "Impor admin SIRANDU"),
        num(p.skor_tata_guna_lahan), num(p.skor_jarak_sungai), num(p.skor_elevasi), num(p.skor_curah_hujan), num(p.skor_drainase), num(p.skor_kepadatan_permukiman),
      ]);
      if (!r.rowCount) throw new Error("Geometri bukan poligon atau kosong.");
      return "inserted";
    },
  },
  elevasi: {
    table: "klasifikasi_elevasi",
    replaceable: true,
    async insert(client, f) {
      const p = f.properties || {};
      const kelas = pickClass(p.kelas_elevasi ?? p.kelas, KELAS_ELEV, "Sedang");
      const g = POLY.replace("$GEOM", "$1");
      const q = `
        WITH src AS (SELECT ${g} AS geom)
        INSERT INTO klasifikasi_elevasi (
          wilayah_id, nama_wilayah, kecamatan, kelas_elevasi, rentang_mdpl, rata_elevasi_mdpl, warna_hex,
          deskripsi_topografi, rekomendasi_tata_ruang, sumber_data, geom, updated_at)
        SELECT ${WIL_OF("src.geom")}, $2, COALESCE($3, ${KEC_OF("src.geom")}, 'Kota Jambi'), $4, $5, $6, $7, $8, $9, $10, src.geom, CURRENT_TIMESTAMP
        FROM src WHERE NOT ST_IsEmpty(src.geom)
        RETURNING id;`;
      const r = await client.query(q, [
        JSON.stringify(f.geometry), str(p.nama_wilayah ?? p.nama, `Elevasi ${kelas}`), str(p.kecamatan), kelas,
        str(p.rentang_mdpl, kelas === "Rendah" ? "< 10 mdpl" : kelas === "Sedang" ? "10–25 mdpl" : "> 25 mdpl"),
        num(p.rata_elevasi_mdpl ?? p.elevasi, kelas === "Rendah" ? 7 : kelas === "Sedang" ? 17 : 30),
        str(p.warna_hex, WARNA_ELEV[kelas]), str(p.deskripsi_topografi ?? p.deskripsi, `Wilayah elevasi ${kelas.toLowerCase()}`),
        str(p.rekomendasi_tata_ruang ?? p.rekomendasi, "-"), str(p.sumber_data, "DEMNAS (impor admin SIRANDU)"),
      ]);
      if (!r.rowCount) throw new Error("Geometri bukan poligon atau kosong.");
      return "inserted";
    },
  },
  sungai: {
    table: "sungai_kota_jambi",
    replaceable: true,
    async insert(client, f) {
      const p = f.properties || {};
      // MultiLineString dipecah per bagian karena kolom geom bertipe LineString
      const q = `
        INSERT INTO sungai_kota_jambi (nama_sungai, tipe, lebar_rata_rata_meter, geom)
        SELECT $2, $3, $4, (d).geom
        FROM (SELECT ST_Dump(ST_LineMerge(ST_CollectionExtract(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 2))) AS d) x
        WHERE GeometryType((d).geom) = 'LINESTRING'
        RETURNING id;`;
      const r = await client.query(q, [
        JSON.stringify(f.geometry), str(p.nama_sungai ?? p.nama ?? p.name, "Sungai"),
        str(p.tipe, /batang\s*hari/i.test(String(p.nama_sungai ?? p.nama ?? p.name ?? "")) ? "Sungai Utama" : "Anak Sungai"),
        num(p.lebar_rata_rata_meter ?? p.lebar, 25),
      ]);
      if (!r.rowCount) throw new Error("Geometri bukan garis (LineString).");
      return "inserted";
    },
  },
  batas: {
    table: "wilayah_administrasi",
    replaceable: false,
    async insert(client, f) {
      const p = f.properties || {};
      const kec = str(p.nama_kecamatan ?? p.kecamatan ?? p.WADMKC ?? p.KECAMATAN);
      const kel = str(p.nama_kelurahan ?? p.kelurahan ?? p.desa ?? p.WADMKD ?? p.NAMOBJ ?? p.DESA);
      if (!kec || !kel) throw new Error("Properti nama_kecamatan dan nama_kelurahan wajib ada.");
      const g = POLY.replace("$GEOM", "$1");
      const up = await client.query(
        `UPDATE wilayah_administrasi SET geom = ${g}, kode_wilayah = COALESCE($4, kode_wilayah), updated_at = CURRENT_TIMESTAMP
         WHERE lower(nama_kecamatan) = lower($2) AND lower(nama_kelurahan) = lower($3) RETURNING id;`,
        [JSON.stringify(f.geometry), kec, kel, str(p.kode_wilayah ?? p.KDEPUM ?? p.kode)]);
      if (up.rowCount) return "updated";
      await client.query(
        `INSERT INTO wilayah_administrasi (kode_wilayah, nama_kecamatan, nama_kelurahan, geom) VALUES ($4, $2, $3, ${g});`,
        [JSON.stringify(f.geometry), kec, kel, str(p.kode_wilayah ?? p.KDEPUM ?? p.kode)]);
      return "inserted";
    },
  },
};

const importLayer = async (req, res) => {
  const layer = LAYERS[req.params.layer];
  if (!layer) return res.status(404).json({ success: false, message: "Layer tidak dikenal. Pilihan: zona, elevasi, sungai, batas." });
  const { features, mode = "append" } = req.body || {};
  if (!Array.isArray(features) || features.length === 0) return res.status(400).json({ success: false, message: "Tidak ada fitur untuk diimpor." });
  if (features.length > 5000) return res.status(400).json({ success: false, message: "Maksimal 5000 fitur per impor. Pecah file Anda." });
  if (mode === "replace" && !layer.replaceable) return res.status(400).json({ success: false, message: "Layer batas wilayah tidak bisa diganti total; data diperbarui per kelurahan." });

  const client = await pool.connect();
  const out = { inserted: 0, updated: 0, failed: [], deleted: 0 };
  try {
    await client.query("BEGIN");
    if (mode === "replace") out.deleted = (await client.query(`DELETE FROM ${layer.table}`)).rowCount;
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      await client.query("SAVEPOINT sp");
      try {
        if (!f || !f.geometry) throw new Error("Fitur tanpa geometri.");
        const r = await layer.insert(client, f);
        out[r]++;
        await client.query("RELEASE SAVEPOINT sp");
      } catch (e) {
        await client.query("ROLLBACK TO SAVEPOINT sp");
        out.failed.push({ index: i, message: e.message });
      }
    }
    if (out.inserted + out.updated === 0) {
      await client.query("ROLLBACK");
      return res.status(422).json({ success: false, message: "Tidak ada fitur yang berhasil diimpor. Data lama tidak diubah.", ...out, deleted: 0 });
    }
    await client.query("COMMIT");
    res.status(200).json({ success: true, message: `Impor selesai: ${out.inserted} ditambah, ${out.updated} diperbarui, ${out.failed.length} gagal.`, ...out });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error importLayer:", err.message);
    res.status(500).json({ success: false, message: "Impor gagal di server. Tidak ada data yang diubah.", error: err.message });
  } finally {
    client.release();
  }
};

const importSummary = async (req, res) => {
  try {
    const out = {};
    for (const [k, l] of Object.entries(LAYERS)) out[k] = Number((await pool.query(`SELECT COUNT(*) FROM ${l.table}`)).rows[0].count);
    res.status(200).json({ success: true, data: out });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat ringkasan layer", error: err.message });
  }
};

module.exports = { importLayer, importSummary };
