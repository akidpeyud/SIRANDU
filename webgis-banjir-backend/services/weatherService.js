const axios = require("axios");
const pool = require("../config/db");
const { hitungSkorRisiko } = require("./earlyWarningService");

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Konversi weather_code WMO ke deskripsi bahasa Indonesia
 */
const getWeatherDescription = (code) => {
  const codes = {
    0: "Cerah",
    1: "Cerah Berawan",
    2: "Berawan Sebagian",
    3: "Mendung / Berawan Tebal",
    45: "Berkabut",
    48: "Kabut Tebal",
    51: "Gerimis Ringan",
    53: "Gerimis Sedang",
    55: "Gerimis Lebat",
    61: "Hujan Ringan",
    63: "Hujan Sedang",
    65: "Hujan Lebat",
    80: "Hujan Lokal Ringan",
    81: "Hujan Lokal Sedang",
    82: "Hujan Lokal Sangat Lebat",
    95: "Badai Petir Ringan/Sedang",
    96: "Badai Petir Disertai Hujan Es",
  };
  return codes[code] || "Cuaca Tidak Terdefinisi";
};

/**
 * Menghitung status kerawanan banjir berdasarkan standar intensitas curah hujan BMKG
 * - Aman: 0 - 20 mm
 * - Waspada: 20 - 50 mm
 * - Siaga: 50 - 70 mm
 * - Bahaya: > 70 mm
 */
const calculateStatusRawan = (precipitation) => {
  const val = Number(precipitation) || 0;
  if (val >= 70) return "Bahaya";
  if (val >= 50) return "Siaga";
  if (val >= 20) return "Waspada";
  return "Aman";
};

/**
 * Mengambil data cuaca real-time dari Open-Meteo berdasarkan koordinat (Latitude & Longitude)
 */
const fetchWeatherByCoords = async (latitude, longitude) => {
  try {
    const response = await axios.get(OPEN_METEO_URL, {
      params: {
        latitude,
        longitude,
        current: "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code",
        daily: "precipitation_sum,precipitation_probability_max",
        timezone: "Asia/Jakarta",
        forecast_days: 1,
      },
      timeout: 8000,
    });

    const current = response.data.current;
    const daily = response.data.daily;

    // Nilai curah hujan saat ini (mm) atau estimasi akumulasi harian jika current = 0
    const currentRain = current.precipitation || current.rain || 0;
    const dailyRain = daily && daily.precipitation_sum ? daily.precipitation_sum[0] : 0;

    return {
      suhu: current.temperature_2m,
      kelembapan: current.relative_humidity_2m,
      curah_hujan_saat_ini: currentRain,
      curah_hujan_harian: dailyRain,
      weather_code: current.weather_code,
      kondisi_cuaca: getWeatherDescription(current.weather_code),
      waktu: current.time,
    };
  } catch (error) {
    console.error(`Gagal mengambil data Open-Meteo untuk [${latitude}, ${longitude}]:`, error.message);
    throw new Error("Gagal mengambil data cuaca dari Open-Meteo");
  }
};

/**
 * Sinkronisasi data curah hujan Open-Meteo untuk SATU wilayah spesifik di database
 */
const syncSingleWilayahWeather = async (id) => {
  const res = await pool.query(
    "SELECT id, nama_wilayah, latitude, longitude, COALESCE(faktor_kerentanan, 2) AS faktor_kerentanan, COALESCE(elevasi, 15.0) AS elevasi FROM wilayah_banjir WHERE id = $1",
    [id]
  );
  if (res.rows.length === 0) {
    throw new Error("Wilayah tidak ditemukan");
  }

  const { latitude, longitude, nama_wilayah, faktor_kerentanan, elevasi } = res.rows[0];
  const weather = await fetchWeatherByCoords(latitude, longitude);

  // Ambil curah hujan
  const curahHujan = weather.curah_hujan_saat_ini > 0 ? weather.curah_hujan_saat_ini : weather.curah_hujan_harian;
  
  // Hitung Skor Risiko Multi-Kriteria (Curah Hujan + Kerentanan + Elevasi)
  const analisis = hitungSkorRisiko(curahHujan, faktor_kerentanan, elevasi);

  const updateQuery = `
    UPDATE wilayah_banjir
    SET curah_hujan = $1, status_rawan = $2, skor_risiko = $3, rekomendasi = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, nama_wilayah, curah_hujan, status_rawan, skor_risiko, rekomendasi, updated_at;
  `;
  const updateRes = await pool.query(updateQuery, [
    curahHujan,
    analisis.status_rawan,
    analisis.skor_risiko,
    analisis.rekomendasi,
    id,
  ]);

  return {
    wilayah: updateRes.rows[0],
    detail_cuaca: weather,
  };
};

/**
 * Sinkronisasi data curah hujan Open-Meteo untuk SEMUA wilayah di database
 */
const syncAllWilayahWeather = async () => {
  const { rows: wilayahList } = await pool.query(
    "SELECT id, nama_wilayah, latitude, longitude, COALESCE(faktor_kerentanan, 2) AS faktor_kerentanan, COALESCE(elevasi, 15.0) AS elevasi FROM wilayah_banjir"
  );
  
  const results = [];

  for (const item of wilayahList) {
    try {
      const weather = await fetchWeatherByCoords(item.latitude, item.longitude);
      const curahHujan = weather.curah_hujan_saat_ini > 0 ? weather.curah_hujan_saat_ini : weather.curah_hujan_harian;
      
      // Hitung analisis risiko
      const analisis = hitungSkorRisiko(curahHujan, item.faktor_kerentanan, item.elevasi);

      await pool.query(
        `UPDATE wilayah_banjir 
         SET curah_hujan = $1, status_rawan = $2, skor_risiko = $3, rekomendasi = $4, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $5`,
        [curahHujan, analisis.status_rawan, analisis.skor_risiko, analisis.rekomendasi, item.id]
      );

      results.push({
        id: item.id,
        nama_wilayah: item.nama_wilayah,
        curah_hujan: curahHujan,
        status_rawan: analisis.status_rawan,
        skor_risiko: analisis.skor_risiko,
        rekomendasi: analisis.rekomendasi,
        kondisi: weather.kondisi_cuaca,
        status: "sukses",
      });
    } catch (err) {
      results.push({
        id: item.id,
        nama_wilayah: item.nama_wilayah,
        status: "gagal",
        error: err.message,
      });
    }
  }

  return results;
};

module.exports = {
  getWeatherDescription,
  calculateStatusRawan,
  fetchWeatherByCoords,
  syncSingleWilayahWeather,
  syncAllWilayahWeather,
};
