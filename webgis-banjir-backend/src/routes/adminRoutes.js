const express = require("express");
const router = express.Router();
const { loginAdmin, getAdminProfile } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");
const {
  getAllPoskoAdmin,
  createPosko,
  updatePosko,
  togglePoskoStatus,
  deletePosko,
  getAllAirBersihAdmin,
  createAirBersih,
  updateAirBersih,
  toggleAirBersihStatus,
  deleteAirBersih,
  getAllTitikBanjirAdmin,
  createTitikBanjir,
  updateTitikBanjir,
  deleteTitikBanjir,
  getStatistikValidasiBanjir,
  getAllJalanTergenangAdmin,
  createJalanTergenang,
  toggleStatusJalan,
  deleteJalanTergenang,
  getPengaturanAmbang,
  updatePengaturanAmbang,
  getKecamatanAdminList,
  inputCurahHujanManual,
  getBobotModel,
  updateBobotModel,
  getLogNotifikasiAdmin,
  getPelangganNotifikasiAdmin,
} = require("../controllers/adminCrudController");
const { importLayer, importSummary } = require("../controllers/adminImportController");

// 1. Autentikasi Admin (Publik)
router.post("/login", loginAdmin);

// Seluruh rute di bawah ini diproteksi oleh JWT verifyToken
router.use(verifyToken);

// 2. Profil Admin
router.get("/me", getAdminProfile);

// 3. CRUD Posko Pengungsian (F07)
router.get("/posko", getAllPoskoAdmin);
router.post("/posko", createPosko);
router.put("/posko/:id", updatePosko);
router.patch("/posko/:id/status", togglePoskoStatus);
router.delete("/posko/:id", deletePosko);

// 4. CRUD Sumber Air Bersih (F08)
router.get("/air-bersih", getAllAirBersihAdmin);
router.post("/air-bersih", createAirBersih);
router.put("/air-bersih/:id", updateAirBersih);
router.patch("/air-bersih/:id/status", toggleAirBersihStatus);
router.delete("/air-bersih/:id", deleteAirBersih);

// 5. CRUD Titik Banjir Historis & Validasi Model
router.get("/titik-banjir", getAllTitikBanjirAdmin);
router.post("/titik-banjir", createTitikBanjir);
router.put("/titik-banjir/:id", updateTitikBanjir);
router.delete("/titik-banjir/:id", deleteTitikBanjir);
router.get("/titik-banjir/statistik", getStatistikValidasiBanjir);

// 6. Penandaan Ruas Jalan Tergenang (F09/F10)
router.get("/jalan-tergenang", getAllJalanTergenangAdmin);
router.post("/jalan-tergenang", createJalanTergenang);
router.patch("/jalan-tergenang/:id/status", toggleStatusJalan);
router.delete("/jalan-tergenang/:id", deleteJalanTergenang);

// 7. Input Curah Hujan Manual (Fallback Sensor/API)
router.get("/kecamatan-list", getKecamatanAdminList);
router.post("/curah-hujan-manual", inputCurahHujanManual);

// 8. Pengaturan Ambang Waspada / Siaga & Bobot Model AHP
router.get("/pengaturan-ambang", getPengaturanAmbang);
router.put("/pengaturan-ambang/:id", updatePengaturanAmbang);
router.get("/bobot-model", getBobotModel);
router.put("/bobot-model/:id", updateBobotModel);

// 9. Log Notifikasi & Pemantauan Data
router.get("/log-notifikasi", getLogNotifikasiAdmin);
router.get("/pelanggan-notifikasi", getPelangganNotifikasiAdmin);

// 10. Impor layer poligon/garis dari file (GeoJSON/KML/Shapefile yang sudah diurai di frontend)
router.get("/import/summary", importSummary);
router.post("/import/:layer", importLayer);

module.exports = router;
