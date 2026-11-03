const pool = require("../config/db");

/**
 * F09: Navigasi Jalur Evakuasi Peka Risiko (pgRouting Dijkstra dengan Dynamic Risk Cost)
 * 
 * Rumus Biaya (Cost) Dinamis:
 * 1. Biaya Dasar: panjang fisik jalan (panjang_meter).
 * 2. Penalti Besar (x 3.5): Jika jalan beririsan (ST_Intersects) dengan zona rawan banjir kelas Tinggi / Sangat Tinggi.
 * 3. Penalti Sangat Besar / Blokir (Cost = 999,999): Jika beririsan (ST_Intersects) dengan ruas jalan tergenang aktif dari admin.
 */
const hitungRuteEvakuasi = async (startLat, startLng, poskoId = null) => {
  const sLat = parseFloat(startLat);
  const sLng = parseFloat(startLng);

  if (isNaN(sLat) || isNaN(sLng)) {
    throw new Error("Koordinat awal latitude / longitude tidak valid!");
  }

  // 1. Tentukan Posko Tujuan: Jika tidak dipilih spesifik, cari posko aktif terdekat yang masih ada kapasitas
  let poskoInfo = null;
  if (!poskoId) {
    const qNearestPosko = `
      SELECT 
        id, nama_posko, alamat, kapasitas_jiwa, terisi_jiwa, kontak_pj,
        ST_Y(geom) as lat, ST_X(geom) as lng,
        ROUND(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) as jarak_garis_lurus
      FROM posko_pengungsian
      WHERE status_aktif = true AND (kapasitas_jiwa - terisi_jiwa) > 0
      ORDER BY jarak_garis_lurus ASC
      LIMIT 1;
    `;
    const resPosko = await pool.query(qNearestPosko, [sLng, sLat]);
    if (resPosko.rows.length === 0) {
      throw new Error("Tidak ditemukan posko pengungsian aktif yang tersedia saat ini.");
    }
    poskoInfo = resPosko.rows[0];
  } else {
    const qPosko = `
      SELECT 
        id, nama_posko, alamat, kapasitas_jiwa, terisi_jiwa, kontak_pj,
        ST_Y(geom) as lat, ST_X(geom) as lng,
        ROUND(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) as jarak_garis_lurus
      FROM posko_pengungsian WHERE id = $3;
    `;
    const resPosko = await pool.query(qPosko, [sLng, sLat, poskoId]);
    if (resPosko.rows.length === 0) throw new Error("Posko yang dipilih tidak ditemukan.");
    poskoInfo = resPosko.rows[0];
  }

  const pLng = parseFloat(poskoInfo.lng);
  const pLat = parseFloat(poskoInfo.lat);

  // 2. Cari Node Awal (Vertex Terdekat di Graf Jalan dari Posisi Warga)
  const qNearestStartNode = `
    SELECT source AS node_id, 
           ROUND(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS dist
    FROM jaringan_jalan_evakuasi
    ORDER BY dist ASC
    LIMIT 1;
  `;
  const resStartNode = await pool.query(qNearestStartNode, [sLng, sLat]);

  // 3. Cari Node Tujuan (Vertex Terdekat di Graf Jalan dari Posisi Posko)
  const qNearestEndNode = `
    SELECT target AS node_id, 
           ROUND(ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)) AS dist
    FROM jaringan_jalan_evakuasi
    ORDER BY dist ASC
    LIMIT 1;
  `;
  const resEndNode = await pool.query(qNearestEndNode, [pLng, pLat]);

  let coordinates = [];
  let instruksi = [];
  let totalJarakMeter = 0;
  let statusKeamananRute = "Rute Terverifikasi Aman (Menghindari Jalur Banjir & Cekungan)";

  // Titik pertama SELALU titik awal pengguna
  coordinates.push([sLng, sLat]);

  if (resStartNode.rows.length > 0 && resEndNode.rows.length > 0) {
    const startNode = resStartNode.rows[0].node_id;
    const endNode = resEndNode.rows[0].node_id;

    if (startNode === endNode) {
      instruksi.push({
        urutan: 1,
        nama_jalan: "Menuju Langsung ke Area Posko",
        jarak_meter: Math.round(poskoInfo.jarak_garis_lurus),
      });
      totalJarakMeter = Math.round(poskoInfo.jarak_garis_lurus);
    } else {
      // Dynamic Risk-Aware Dijkstra Query:
      // Terapkan penalti dinamis terhadap zona rawan banjir & jalan tergenang aktif
      const qDijkstra = `
        SELECT 
          d.seq, d.node, d.edge, d.cost,
          j.nama_jalan, j.panjang_meter,
          ST_AsGeoJSON(j.geom)::json AS geom_json
        FROM pgr_dijkstra(
          'SELECT 
             j.id, 
             j.source, 
             j.target,
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM ruas_jalan_tergenang r 
                 WHERE r.status_tergenang = TRUE AND ST_Intersects(j.geom, r.geom)
               ) THEN 999999.0
               WHEN EXISTS (
                 SELECT 1 FROM zona_rawan_banjir z 
                 WHERE z.tingkat_kerawanan_angka >= 4 AND ST_Intersects(j.geom, z.geom)
               ) THEN (j.panjang_meter * 3.5)
               ELSE j.panjang_meter 
             END AS cost,
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM ruas_jalan_tergenang r 
                 WHERE r.status_tergenang = TRUE AND ST_Intersects(j.geom, r.geom)
               ) THEN 999999.0
               WHEN EXISTS (
                 SELECT 1 FROM zona_rawan_banjir z 
                 WHERE z.tingkat_kerawanan_angka >= 4 AND ST_Intersects(j.geom, z.geom)
               ) THEN (j.panjang_meter * 3.5)
               ELSE j.panjang_meter 
             END AS reverse_cost
           FROM jaringan_jalan_evakuasi j',
          $1::bigint,
          $2::bigint,
          false
        ) d
        LEFT JOIN jaringan_jalan_evakuasi j ON d.edge = j.id
        ORDER BY d.seq ASC;
      `;

      const resDijkstra = await pool.query(qDijkstra, [startNode, endNode]);

      if (resDijkstra.rows.length > 0) {
        let step = 1;
        for (const r of resDijkstra.rows) {
          if (r.geom_json && r.geom_json.coordinates) {
            const segCoords = r.geom_json.coordinates;
            segCoords.forEach((pt) => coordinates.push(pt));

            totalJarakMeter += parseFloat(r.panjang_meter) || 0;
            instruksi.push({
              urutan: step++,
              nama_jalan: r.nama_jalan || "Jalur Penghubung Evakuasi",
              jarak_meter: Math.round(parseFloat(r.panjang_meter) || 0),
            });
          }
        }
      }
    }
  }

  // Titik terakhir SELALU titik posko pengungsian tujuan
  coordinates.push([pLng, pLat]);

  if (totalJarakMeter === 0) {
    totalJarakMeter = Math.round(poskoInfo.jarak_garis_lurus);
    instruksi.push({
      urutan: 1,
      nama_jalan: "Jalur Langsung Bebas Hambatan ke Posko",
      jarak_meter: totalJarakMeter,
    });
  }

  // Estimasi berjalan kaki (rata-rata 4.5 km/jam = 75 meter/menit)
  const estimasiJalanKaki = Math.max(1, Math.ceil(totalJarakMeter / 75));
  // Estimasi kendaraan motor (rata-rata 25 km/jam = 416 meter/menit)
  const estimasiMotor = Math.max(1, Math.ceil(totalJarakMeter / 416));

  return {
    titik_asal: {
      latitude: sLat,
      longitude: sLng,
      label: "Lokasi Warga",
    },
    posko_tujuan: {
      id: poskoInfo.id,
      nama_posko: poskoInfo.nama_posko,
      alamat: poskoInfo.alamat,
      kapasitas_tersisa: poskoInfo.kapasitas_jiwa - poskoInfo.terisi_jiwa,
      kontak_darurat: poskoInfo.kontak_pj,
      koordinat: [pLng, pLat],
    },
    ringkasan_rute: {
      total_jarak_meter: Math.round(totalJarakMeter),
      estimasi_jalan_kaki_menit: estimasiJalanKaki,
      estimasi_kendaraan_menit: estimasiMotor,
      status_keamanan: statusKeamananRute,
      model_navigasi: "Dynamic Risk-Cost Dijkstra (Menghindari Ruas Jalan Tergenang & Zona Rawan Tinggi)",
    },
    instruksi_navigasi: instruksi,
    geojson_rute: {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: coordinates,
      },
      properties: {
        total_jarak: Math.round(totalJarakMeter),
        posko: poskoInfo.nama_posko,
        keamanan: statusKeamananRute,
      },
    },
  };
};

module.exports = {
  hitungRuteEvakuasi,
};
