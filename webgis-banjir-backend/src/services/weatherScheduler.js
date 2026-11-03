const cron = require("node-cron");
const axios = require("axios");
const pool = require("../config/db");
const { kirimPeringatanDiniOtomatis } = require("./notifikasiService");

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Klasifikasi Intensitas Curah Hujan Standar BMKG:
 * - 0 mm/jam: Berawan / Tidak Hujan
 * - 0.1 - 5.0 mm/jam: Hujan Ringan
 * - 5.1 - 10.0 mm/jam: Hujan Sedang
 * - 10.1 - 20.0 mm/jam: Hujan Lebat
 * - > 20.0 mm/jam: Hujan Sangat Lebat / Ekstrem
 */
const klasifikasiBMKG = (curahHujan) => {
  const val = parseFloat(curahHujan) || 0.0;
  if (val <= 0.0) return "Berawan / Tidak Hujan";
  if (val <= 5.0) return "Hujan Ringan";
  if (val <= 10.0) return "Hujan Sedang";
  if (val <= 20.0) return "Hujan Lebat";
  return "Hujan Sangat Lebat / Ekstrem";
};

/**
 * Menghitung Status Peringatan Banjir Berdasarkan Kelas BMKG:
 * - Siaga: Curah Hujan > 10.0 mm/jam (Hujan Lebat / Ekstrem)
 * - Waspada: Curah Hujan 5.1 - 10.0 mm/jam (Hujan Sedang)
 * - Normal: Curah Hujan 0.0 - 5.0 mm/jam (Cerah / Berawan / Ringan)
 */
const tentukanStatusPeringatan = (curahHujan) => {
  const val = parseFloat(curahHujan) || 0.0;
  if (val > 10.0) return "Siaga";
  if (val > 5.0) return "Waspada";
  return "Normal";
};

/**
 * Proses A: Penarikan Data Cuaca 11 Kecamatan Kota Jambi dari Open-Meteo
 * Dilengkapi Mekanisme Fallback (is_delayed = true) jika API eksternal gagal.
 */
const syncWeatherOpenMeteo = async () => {
  console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🕒 [WEATHER SCHEDULER] Menjalankan pemantauan cuaca 11 kecamatan...`);

  let client;
  try {
    client = await pool.connect();
    const { rows: listKecamatan } = await client.query(
      "SELECT id, nama_kecamatan, latitude, longitude, curah_hujan_terkini, status_peringatan FROM kecamatan ORDER BY id ASC"
    );

    for (const kec of listKecamatan) {
      try {
        // Request cuaca ke Open-Meteo API
        const response = await axios.get(OPEN_METEO_BASE_URL, {
          params: {
            latitude: kec.latitude,
            longitude: kec.longitude,
            current: "temperature_2m,relative_humidity_2m,precipitation,rain",
            hourly: "precipitation,temperature_2m,relative_humidity_2m",
            timezone: "Asia/Jakarta",
            forecast_days: 1, // 24 jam
          },
          timeout: 8000, // Timeout 8 detik
        });

        const current = response.data.current;
        const hourly = response.data.hourly;

        const curahHujan = current.precipitation !== undefined ? current.precipitation : (current.rain || 0.0);
        const intensitas = klasifikasiBMKG(curahHujan);
        const status = tentukanStatusPeringatan(curahHujan);
        const suhu = current.temperature_2m || 28.0;
        const kelembapan = current.relative_humidity_2m || 80;

        // Update status terkini di database (is_delayed = false karena sukses)
        const updateKecamatanSql = `
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
        await client.query(updateKecamatanSql, [curahHujan, intensitas, status, suhu, kelembapan, kec.id]);

        const statusLama = kec.status_peringatan || "Normal";
        const levelScore = { "Normal": 1, "Waspada": 2, "Siaga": 3 };

        // F06: Jika status peringatan NAIK, kirim email notifikasi otomatis ke warga terdaftar
        if ((levelScore[status] || 1) > (levelScore[statusLama] || 1)) {
          kirimPeringatanDiniOtomatis(kec.id, statusLama, status, curahHujan, intensitas)
            .catch(errAlert => console.error("Gagal broadcast alert email:", errAlert.message));
        }

        // Catat titik saat ini ke log_curah_hujan
        await client.query(
          `INSERT INTO log_curah_hujan (kecamatan_id, curah_hujan, intensitas, suhu, kelembapan, waktu, sumber, is_delayed)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'Open-Meteo Weather API', false)
           ON CONFLICT (kecamatan_id, waktu) DO UPDATE
           SET curah_hujan = EXCLUDED.curah_hujan,
               intensitas = EXCLUDED.intensitas,
               is_delayed = false;`,
          [kec.id, curahHujan, intensitas, suhu, kelembapan]
        );

        // Sinkronisasi data hourly 24 jam untuk grafik F04 jika belum terisi
        if (hourly && hourly.time && hourly.time.length > 0) {
          const countLog = await client.query("SELECT COUNT(*) FROM log_curah_hujan WHERE kecamatan_id = $1", [kec.id]);
          if (parseInt(countLog.rows[0].count) < 12) {
            for (let i = 0; i < hourly.time.length; i++) {
              const hTime = hourly.time[i];
              const hRain = hourly.precipitation[i] || 0.0;
              const hTemp = hourly.temperature_2m ? hourly.temperature_2m[i] : suhu;
              const hHum = hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : kelembapan;
              const hIntensitas = klasifikasiBMKG(hRain);

              await client.query(
                `INSERT INTO log_curah_hujan (kecamatan_id, curah_hujan, intensitas, suhu, kelembapan, waktu, sumber, is_delayed)
                 VALUES ($1, $2, $3, $4, $5, $6, 'Open-Meteo Weather API', false)
                 ON CONFLICT (kecamatan_id, waktu) DO NOTHING`,
                [kec.id, hRain, hIntensitas, hTemp, hHum, hTime]
              );
            }
          }
        }

      } catch (errApi) {
        // Logika Resilience / Fallback:
        // Jika Open-Meteo gagal/timeout, JANGAN timpa data lama dengan error.
        // Pertahankan data terakhir dan ubah is_delayed = true.
        console.warn(`[FALLBACK RESILIENCE] API gagal diakses untuk Kec. ${kec.nama_kecamatan}: ${errApi.message}. Mempertahankan data lama dengan flag is_delayed = true.`);
        await client.query("UPDATE kecamatan SET is_delayed = true WHERE id = $1", [kec.id]);
      }
    }

    console.log(`[${new Date().toLocaleTimeString('id-ID')}] ✅ [WEATHER SCHEDULER] Sinkronisasi data 11 kecamatan selesai.`);
  } catch (err) {
    console.error("❌ Kesalahan internal pada weatherScheduler:", err.message);
  } finally {
    if (client) client.release();
  }
};

/**
 * Inisialisasi Job Scheduler: Berjalan berkala setiap 1 jam
 * Cron expression: "0 * * * *"
 */
const initWeatherScheduler = () => {
  // Eksekusi langsung saat startup
  syncWeatherOpenMeteo();

  // Jadwalkan tiap jam
  cron.schedule("0 * * * *", () => {
    syncWeatherOpenMeteo();
  });

  console.log("⏱️ Scheduler Pemantauan Cuaca 1 Jam (Open-Meteo BMKG) Aktif.");
};

module.exports = {
  klasifikasiBMKG,
  tentukanStatusPeringatan,
  syncWeatherOpenMeteo,
  initWeatherScheduler,
};
