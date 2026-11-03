const nodemailer = require("nodemailer");
const crypto = require("crypto");
const pool = require("../config/db");

// Konfigurasi Transporter Nodemailer (Dukungan SMTP Asli & Fallback Mock Transporter)
let transporter;

const setupTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Mode Pengujian Lokal / Simulasi Aman jika belum ada akun SMTP
    transporter = {
      sendMail: async (options) => {
        console.log(`\n📧 [SIMULASI EMAIL TERKIRIM]`);
        console.log(`   Ke: ${options.to}`);
        console.log(`   Subjek: ${options.subject}`);
        console.log(`   Waktu: ${new Date().toISOString()}`);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }
};
setupTransporter();

/**
 * 1. Kirim Email Verifikasi Berlangganan Notifikasi (F06)
 */
const kirimEmailVerifikasi = async (email, token, namaKecamatan) => {
  const verifyUrl = `http://localhost:${process.env.PORT || 3000}/api/verify/${token}`;
  const unsubUrl = `http://localhost:${process.env.PORT || 3000}/api/unsubscribe?email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: '"SIRANDU Kota Jambi" <no-reply@sirandu.jambikota.go.id>',
    to: email,
    subject: `Konfirmasi Berlangganan Peringatan Banjir - Kecamatan ${namaKecamatan}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-top: 0;">🌊 SIRANDU Kota Jambi</h2>
        <p>Halo Warga Kota Jambi,</p>
        <p>Terima kasih telah mendaftar layanan notifikasi peringatan dini bencana banjir untuk wilayah <b>Kecamatan ${namaKecamatan}</b>.</p>
        <p>Silakan klik tautan di bawah ini untuk mengonfirmasi email Anda:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            ✅ Verifikasi Email Saya
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Atau salin tautan berikut ke browser Anda:<br>${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 11px; color: #94a3b8;">
          Jika Anda tidak merasa mendaftar layanan ini, silakan abaikan email ini atau <a href="${unsubUrl}">batalkan langganan</a>.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * 2. Kirim Notifikasi Peringatan Dini Otomatis Saat Status Cuaca Naik (F06 & F05)
 * Dipanggil dari weatherScheduler.js ketika status kecamatan naik (Normal -> Waspada/Siaga).
 */
const kirimPeringatanDiniOtomatis = async (idKecamatan, statusLama, statusBaru, curahHujan, intensitas) => {
  try {
    // 1. Ambil nama kecamatan
    const resKec = await pool.query("SELECT nama_kecamatan FROM kecamatan WHERE id = $1", [idKecamatan]);
    if (resKec.rows.length === 0) return;
    const namaKecamatan = resKec.rows[0].nama_kecamatan;

    // 2. Ambil seluruh pelanggan terverifikasi di kecamatan ini
    const queryPelanggan = `
      SELECT email, token_verifikasi 
      FROM pelanggan_notifikasi 
      WHERE (id_kecamatan = $1 OR wilayah_id = $1)
        AND (is_verified = TRUE OR status_terkonfirmasi = TRUE);
    `;
    const resPelanggan = await pool.query(queryPelanggan, [idKecamatan]);
    const listPelanggan = resPelanggan.rows;

    if (listPelanggan.length === 0) {
      console.log(`ℹ️ [NOTIFIKASI] Status Kecamatan ${namaKecamatan} naik ke ${statusBaru}, namun belum ada pelanggan terverifikasi.`);
      return;
    }

    console.log(`🚨 [ALERT CUACA] Mengirimkan peringatan ${statusBaru} ke ${listPelanggan.length} pelanggan di Kec. ${namaKecamatan}...`);

    const warnaHeader = statusBaru === "Siaga" ? "#ef4444" : "#f59e0b";
    const subjek = `⚠️ PERINGATAN DINI BANJIR: Status ${statusBaru.toUpperCase()} di Kecamatan ${namaKecamatan}`;

    let suksesKirim = 0;

    for (const p of listPelanggan) {
      try {
        const unsubUrl = `http://localhost:${process.env.PORT || 3000}/api/unsubscribe?email=${encodeURIComponent(p.email)}`;
        const ruteUrl = `http://localhost:${process.env.PORT || 3000}/peta`;

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 2px solid ${warnaHeader}; border-radius: 8px;">
            <div style="background-color: ${warnaHeader}; color: #ffffff; padding: 12px; text-align: center; border-radius: 6px; font-weight: bold; font-size: 16px;">
              ⚠️ PERINGATAN DINI SIRANDU KOTA JAMBI: STATUS ${statusBaru.toUpperCase()}
            </div>
            <div style="padding: 15px 0;">
              <p>Yth. Warga <b>Kecamatan ${namaKecamatan}</b>,</p>
              <p>Sistem pemantauan cuaca otomatis mendeteksi kenaikan intensitas curah hujan di wilayah Anda:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
                <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><b>Status Peringatan</b></td><td style="padding: 8px; border: 1px solid #e2e8f0; color: ${warnaHeader}; font-weight: bold;">${statusLama} ➔ ${statusBaru}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><b>Curah Hujan Terkini</b></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${curahHujan} mm/jam</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><b>Klasifikasi BMKG</b></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${intensitas}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><b>Waktu Pembaruan</b></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date().toLocaleString("id-ID")} WIB</td></tr>
              </table>
              <div style="background: #eff6ff; padding: 12px; border-left: 4px solid #2563eb; border-radius: 4px; font-size: 12px; margin: 15px 0;">
                <b>💡 Tindakan Pencegahan Segera:</b>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                  <li>Pindahkan peralatan elektronik dan surat berharga ke tempat yang lebih tinggi.</li>
                  <li>Waspadai luapan saluran drainase dan bantaran anak sungai sekitar.</li>
                  <li>Ketahui jalur evakuasi aman dan posko terdekat melalui portal SIRANDU.</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${ruteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">
                  🗺️ Buka Peta Rute Evakuasi & Posko
                </a>
              </div>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">
              Pesan otomatis dari SIRANDU Smart City Kota Jambi. <a href="${unsubUrl}">Berhenti Berlangganan</a>
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: '"SIRANDU Peringatan Dini" <alert@sirandu.jambikota.go.id>',
          to: p.email,
          subject: subjek,
          html: htmlContent,
        });

        suksesKirim++;
      } catch (errP) {
        console.error(`Gagal kirim email ke ${p.email}:`, errP.message);
      }
    }

    // 3. Catat Riwayat ke Tabel log_notifikasi
    await pool.query(
      `INSERT INTO log_notifikasi (
        id_kecamatan, wilayah_id, status_sebelumnya, status_baru, 
        subjek_email, jumlah_terkirim, jumlah_penerima, waktu, waktu_kirim, status_pengiriman
      )
      VALUES ($1, $1, $2, $3, $4, $5, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6)`,
      [idKecamatan, statusLama, statusBaru, subjek, suksesKirim, "Sukses"]
    );

    console.log(`✅ [NOTIFIKASI] Berhasil mengirimkan ${suksesKirim}/${listPelanggan.length} email peringatan dan dicatat ke log_notifikasi.`);
  } catch (err) {
    console.error("Error kirimPeringatanDiniOtomatis:", err.message);
  }
};

module.exports = {
  kirimEmailVerifikasi,
  kirimPeringatanDiniOtomatis,
};
