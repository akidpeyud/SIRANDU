const evakuasiService = require("../services/evakuasiService");

// POST /api/evakuasi/rute
const getRuteEvakuasi = async (req, res) => {
  try {
    const { start_lat, start_lng, posko_id } = req.body;

    if (!start_lat || !start_lng) {
      return res.status(400).json({
        success: false,
        message: "Koordinat awal start_lat dan start_lng wajib dikirim!",
      });
    }

    const hasilRute = await evakuasiService.hitungRuteEvakuasi(start_lat, start_lng, posko_id);

    res.status(200).json({
      success: true,
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
