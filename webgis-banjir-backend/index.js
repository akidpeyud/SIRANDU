const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

// Inisialisasi koneksi database PostgreSQL (PostGIS)
require("./src/config/db");

// Import Routes Modular dari src/routes
const cuacaRoutes = require("./src/routes/cuacaRoutes");
const wilayahRoutes = require("./src/routes/wilayahRoutes");
const earlyWarningRoutes = require("./src/routes/earlyWarningRoutes");
const petaRoutes = require("./src/routes/petaRoutes");
const poskoRoutes = require("./src/routes/poskoRoutes");
const airBersihRoutes = require("./src/routes/airBersihRoutes");
const evakuasiRoutes = require("./src/routes/evakuasiRoutes");
const pemantauanRoutes = require("./src/routes/pemantauanRoutes");
const notifikasiRoutes = require("./src/routes/notifikasiRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const titikBanjirRoutes = require("./src/routes/titikBanjirRoutes");
const jalanTergenangRoutes = require("./src/routes/jalanTergenangRoutes");

// Import Service Scheduler Cuaca 11 Kecamatan (F04 & F05)
const { initWeatherScheduler } = require("./src/services/weatherScheduler");

const app = express();
const port = process.env.PORT || 3000;

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files & Peta Tester
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.get("/peta", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/demo", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Root Health Check Route
app.get("/", (req, res) => {
  res.json({
    status: "online",
    architecture: "Modular src/ (Fase 1 PostGIS & Fase 2 Scheduler Open-Meteo)",
    message: "API Backend SIRANDU Aktif! 🚀",
    preview_url: "http://localhost:" + port + "/peta",
    endpoints: {
      cuaca_11_kecamatan: "/api/cuaca",
      grafik_cuaca_24jam: "/api/cuaca/:id_kecamatan",
      batas_administrasi: "/api/peta/batas-administrasi",
      sungai_buffer: "/api/peta/sungai-buffer",
      posko_pengungsian: "/api/posko/geojson",
      air_bersih: "/api/air-bersih/geojson",
      rute_evakuasi: "/api/evakuasi/rute"
    }
  });
});

// Alias Route Langsung Sesuai Spesifikasi: GET /api/cek-lokasi?lat=...&lng=...
const { cekRisikoLokasi } = require("./src/controllers/petaController");
app.get("/api/cek-lokasi", cekRisikoLokasi);
app.post("/api/cek-lokasi", cekRisikoLokasi);

// Alias Route Notifikasi Sesuai Spesifikasi: POST /api/subscribe, GET /api/verify/:token, DELETE /api/unsubscribe
const {
  subscribeNotifikasi,
  verifySubscription,
  unsubscribeNotifikasi,
} = require("./src/controllers/notifikasiController");
app.post("/api/subscribe", subscribeNotifikasi);
app.get("/api/verify/:token", verifySubscription);
app.delete("/api/unsubscribe", unsubscribeNotifikasi);
app.get("/api/unsubscribe", unsubscribeNotifikasi);

// Routing API
app.use("/api/admin", adminRoutes);
app.use("/api/cuaca", cuacaRoutes);
app.use("/api/wilayah", wilayahRoutes);
app.use("/api/peringatan-dini", earlyWarningRoutes);
app.use("/api/peta", petaRoutes);
app.use("/api/posko", poskoRoutes);
app.use("/api/air-bersih", airBersihRoutes);
app.use("/api/titik-banjir", titikBanjirRoutes);
app.use("/api/jalan-tergenang", jalanTergenangRoutes);
app.use("/api/evakuasi", evakuasiRoutes);
app.use("/api/pemantauan", pemantauanRoutes);
app.use("/api/notifikasi", notifikasiRoutes);

// Fallback 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint tidak ditemukan",
  });
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server SIRANDU (Modular src/) berjalan di http://localhost:${port}`);
  // Inisialisasi scheduler cuaca otomatis setiap 1 jam
  initWeatherScheduler();
});

module.exports = app;
