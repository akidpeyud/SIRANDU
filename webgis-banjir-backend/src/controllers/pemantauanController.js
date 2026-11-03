const pemantauanService = require("../services/pemantauanService");

// 1. Get Grafik Curah Hujan untuk React Charts (F04)
const getGrafikWilayah = async (req, res) => {
  try {
    const { wilayah_id } = req.params;
    const { days = 7 } = req.query;

    const data = await pemantauanService.getGrafikCurahHujan(wilayah_id, days);
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Input Data Cuaca Manual / Dari Sensor & Evaluasi Status (F04 & F05 & F10)
const inputDanEvaluasiCuaca = async (req, res) => {
  try {
    const { wilayah_id, curah_hujan, suhu, kelembapan, sumber } = req.body;

    if (!wilayah_id || curah_hujan === undefined) {
      return res.status(400).json({
        success: false,
        message: "wilayah_id dan curah_hujan wajib diisi!",
      });
    }

    const hasil = await pemantauanService.catatDanEvaluasiCuaca(
      wilayah_id,
      curah_hujan,
      suhu,
      kelembapan,
      sumber
    );

    res.status(201).json({
      success: true,
      message: "Data pemantauan cuaca tercatat dan status wilayah telah dievaluasi!",
      data: hasil,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getGrafikWilayah,
  inputDanEvaluasiCuaca,
};
