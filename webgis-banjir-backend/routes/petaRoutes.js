const express = require("express");
const router = express.Router();
const {
  getBatasAdministrasi,
  getElevasiGeoJSON,
  getSungaiDanBuffer,
  searchWilayah,
  getZonaRawanGeoJSON,
  cekRisikoLokasi,
} = require("../controllers/petaController");

// F01: Batas Wilayah Administrasi Garis & Poligon (?kecamatan=Alam+Barajo)
router.get("/batas-administrasi", getBatasAdministrasi);

// LAYER 2: Ketinggian Tanah DEMNAS (Rendah, Sedang, Tinggi)
router.get("/elevasi", getElevasiGeoJSON);

// LAYER 3: Sungai Batanghari & Buffer Bergradasi 150m, 400m, 800m
router.get("/sungai-buffer", getSungaiDanBuffer);

// F01: Autocomplete Pencarian Wilayah (?q=telanai)
router.get("/cari", searchWilayah);

// F02 & F03: Layer Poligon 5 Kelas Kerawanan Banjir
router.get("/zona-rawan", getZonaRawanGeoJSON);

// F02: Cek Risiko Banjir Lokasi User (Point-in-Polygon PostGIS)
router.post("/cek-lokasi", cekRisikoLokasi);

module.exports = router;
