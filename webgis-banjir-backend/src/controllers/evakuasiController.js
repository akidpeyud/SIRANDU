const evakuasiService = require("../services/evakuasiService");

/**
 * F09: Navigasi Jalur Evakuasi Peka Risiko
 * Mendukung:
 * - GET /api/evakuasi/rute?lat=...&lng=...&posko_id=...
 * - POST /api/evakuasi/rute (body: { start_lat, start_lng, posko_id })
 */
const getRuteEvakuasi = async (req, res) => {
  try {
    const lat = req.query.lat || req.query.start_lat || req.body?.start_lat || req.body?.lat;
    const lng = req.query.lng || req.query.start_lng || req.body?.start_lng || req.body?.lng;
    const poskoId = req.query.posko_id || req.body?.posko_id;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Koordinat awal latitude (lat / start_lat) dan longitude (lng / start_lng) wajib dikirimkan!",
      });
    }

    const hasilRute = await evakuasiService.hitungRuteEvakuasi(lat, lng, poskoId);

    res.status(200).json({
      success: true,
      message: "Rute evakuasi peka risiko berhasil dikalkulasi via pgRouting Dijkstra.",
      data: hasilRute,
    });
  } catch (err) {
    console.error("Error getRuteEvakuasi:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getRuteEvakuasi,
};
