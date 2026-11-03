const cron = require("node-cron");
const axios = require("axios");
const pool = require("../config/db");

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * 3. Klasifikasi Intensitas Curah Hujan Standar BMKG
 */
const klasifikasiCurahHujanBMKG = (curahHujan) => {
  const val = parseFloat(curahHujan) || 0.0;
  if (val <= 0.0) return "Berawan / Tidak Hujan";
  if (val <= 5.0) return "Hujan Ringan";
  if (val <= 10.0) return "Hujan Sedang";
  if (val <= 20.0) return "Hujan Lebat";
  return "Hujan Sangat Lebat / Ekstrem";
};

/**
 * 4. Logika Penentuan Status Peringatan Banjir (Normal, Waspada, Siaga)
 */
const tentukanStatusPeringatan = (curahHujan) => {
  const val = parseFloat(curahHujan) || 0.0;
  if (val > 10.0) return "Siaga";    // Hujan Lebat s/d Ekstrem (> 10 mm/jam)
  if (val > 5.0) return "Waspada";   // Hujan Sedang (5.1 - 10 mm/jam)
  return "Normal";                   // Berawan s/d Hujan Ringan (0 - 5 mm/jam)
};

/**
 * Proses A: Eksekusi Penarikan Data Cuaca 11 Kecamatan Kota Jambi dari Open-Meteo
 * Dilengkapi Resilience / Fallback logic jika API gagal diakses.
 */
const syncCuacaKecamatan = async () => {
  console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🕒 Menjalankan Scheduler Cuaca 11 Kecamatan Kota Jambi...`);

  let client;
  try {
    client = await pool.connect();
    const { rows: listKecamatan } = await client.query(
      "SELECT id, nama_kecamatan, latitude, longitude, curah_hujan_terkini FROM kecamatan ORDER BY id ASC"
    );

    for (const kec of listKecamatan) {
      try {
        // Tarik data cuaca real-time + hourly 24 jam dari Open-Meteo
        const response = await axios.get(OPEN_METEO_URL, {
          params: {
            latitude: kec.latitude,
            longitude: kec.longitude,
            current: "temperature_2m,relative_humidity_2m,precipitation,rain",
            hourly: "precipitation,temperature_2m,relative_humidity_2m",
            timezone: "Asia/Jakarta",
            forecast_days: 1, // 24 jam
          },
          timeout: 7000, // 7 detik timeout
        });

        const current = response.data.current;
        const hourly = response.data.hourly;

        const curahHujan = current.precipitation !== undefined ? current.precipitation : (current.rain || 0.0);
        const intensitas = klasifikasiCurahHujanBMKG(curahHujan);
        const status = tentukanStatusPeringatan(curahHujan);
        const suhu = current.temperature_2m || 28.0;
        const kelembapan = current.relative_humidity_2m || 80;

        // 5. Update data terkini kecamatan (is_delayed = false karena sukses)
        const updateQuery = `
          UPDATE kecamatan
          SET curah_hujan_terkini = $1,
              intensitas_terkini = $2,
              status_peringatan = $3,
              suhu_celsius = $4,
              kelembapan_persen = $5,
              sumber_data = 'Open-Meteo Weather API',
              terakhir_update = CURRENT_TIMESTAMP,
              is_delayed = false
          WHERE id = $6;
        `;
        await client.query(updateQuery, [curahHujan, intensitas, status, suhu, kelembapan, kec.id]);

        // Simpan titik saat ini ke log_curah_hujan
        await client.query(
          `INSERT INTO log_curah_hujan (kecamatan_id, curah_hujan, intensitas, suhu, kelembapan, waktu, sumber, is_delayed)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'Open-Meteo Weather API', false)`,
          [kec.id, curahHujan, intensitas, suhu, kelembapan]
        );

        // Populate / sync data hourly 24 jam ke tabel log_curah_hujan jika log masih sedikit
        if (hourly && hourly.time && hourly.time.length > 0) {
          const countLog = await client.query("SELECT COUNT(*) FROM log_curah_hujan WHERE kecamatan_id = $1", [kec.id]);
          if (parseInt(countLog.rows[0].count) < 12) {
            for (let i = 0; i < hourly.time.length; i++) {
              const hTime = hourly.time[i];
              const hRain = hourly.precipitation[i] || 0.0;
              const hTemp = hourly.temperature_2m ? hourly.temperature_2m[i] : suhu;
              const hHum = hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : kelembapan;
              const hIntensitas = klasifikasiCurahHujanBMKG(hRain);

              await client.query(
                `INSERT INTO log_curah_hujan (kecamatan_id, curah_hujan, intensitas, suhu, kelembapan, waktu, sumber, is_delayed)
                 VALUES ($1, $2, $3, $4, $5, $6, 'Open-Meteo Weather API', false)
                 ON CONFLICT DO NOTHING`,
                [kec.id, hRain, hIntensitas, hTemp, hHum, hTime]
              );
            }
          }
        }

      } catch (errApi) {
        // 6. Kebijakan Resilience / Fallback:
        // Jangan timpa data lama dengan error! Pertahankan data lama dan tandai is_delayed = true
        console.warn(`[FALLBACK WARN] Open-Meteo timeout/gagal untuk Kec. ${kec.nama_kecamatan}: ${errApi.message}. Mempertahankan data terakhir (is_delayed = true).`);
        await client.query("UPDATE kecamatan SET is_delayed = true WHERE id = $1", [kec.id]);
      }
    }

    console.log(`[${new Date().toLocaleTimeString('id-ID')}] ✅ Sinkronisasi Cuaca 11 Kecamatan Selesai.`);
  } catch (error) {
    console.error("❌ Kesalahan fatal pada Scheduler Cuaca:", error.message);
  } finally {
    if (client) client.release();
  }
};

/**
 * Inisialisasi Job Scheduler: Berjalan berkala setiap 1 jam
 * Format cron: "0 * * * *" (menit ke-0 setiap jam)
 */
const initWeatherScheduler = () => {
  // 1. Eksekusi langsung 1x saat server pertama kali start agar database terisi data cuaca terbaru
  syncCuacaKecamatan();

  // 2. Jadwalkan berjalan otomatis setiap 1 jam
  cron.schedule("0 * * * *", () => {
    syncCuacaKecamatan();
  });

  console.log("⏱️ Scheduler Pemantauan Cuaca Otomatis (Tiap 1 Jam) Berhasil Diaktifkan.");
};

module.exports = {
  klasifikasiCurahHujanBMKG,
  tentukanStatusPeringatan,
  syncCuacaKecamatan,
  initWeatherScheduler,
};
