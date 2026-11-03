const earlyWarningService = require("../services/earlyWarningService");

// 1. Get Ringkasan Peringatan Dini Seluruh Wilayah (Dashboard BPBD / Eksekutif)
const getRingkasan = async (req, res) => {
  try {
    const data = await earlyWarningService.getRingkasanEarlyWarning();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: data,
    });
  } catch (err) {
    console.error("Error getRingkasan Early Warning:", err.message);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data sistem peringatan dini",
      error: err.message,
    });
  }
};

// 2. Get Zona Radius Dampak Bahaya (Polygon GeoJSON dari PostGIS Buffer)
const getZonaDampak = async (req, res) => {
  try {
    const { id } = req.params;
    const radius = Number(req.query.radius) || 500; // default 500 meter

    const geojson = await earlyWarningService.getZonaDampakSpasial(id, radius);
    res.status(200).json(geojson);
  } catch (err) {
    console.error("Error getZonaDampak:", err.message);
    res.status(404).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getRingkasan,
  getZonaDampak,
};
