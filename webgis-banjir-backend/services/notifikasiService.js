const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");

// Konfigurasi SMTP Transporter (Fallback ke mode simulasi jika belum di-set di .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "sirandu.jambi@gmail.com",
    pass: process.env.SMTP_PASSWORD || "dummy_pass",
  },
});

/**
 * Helper: Mengirim email aman (dengan fallback aman jika SMTP offline / testing)
 */
const kirimEmailAman = async (mailOptions) => {
  try {
    if (!process.env.SMTP_USER || process.env.SMTP_USER === "sirandu.jambi@gmail.com") {
      console.log(`[SIMULASI SMTP EMAIL] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
      return { messageId: "simulated-id-" + Date.now(), simulated: true };
    }
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.warn(`[SMTP WARN] Gagal kirim email ke ${mailOptions.to}: ${error.message}. Beralih ke fallback log.`);
    return { error: error.message, simulated: true };
  }
};

/**
 * F06: Langganan Notifikasi Email Warga
 */
const subscribeWarga = async (email, wilayahId) => {
  if (!email || !wilayahId) throw new Error("Email dan wilayah_id wajib diisi!");

  // Cek validitas wilayah
  const qWil = "SELECT id, nama_kelurahan, nama_kecamatan FROM wilayah_administrasi WHERE id = $1";
  const resWil = await pool.query(qWil, [wilayahId]);
  if (resWil.rows.length === 0) throw new Error("Wilayah tidak ditemukan!");

  const namaKel = resWil.rows[0].nama_kelurahan;
  const tokenKonfirmasi = crypto.randomBytes(24).toString("hex");
  const tokenUnsubscribe = crypto.randomBytes(24).toString("hex");

  const query = `
    INSERT INTO pelanggan_notifikasi (email, wilayah_id, token_konfirmasi, status_terkonfirmasi, token_unsubscribe)
    VALUES ($1, $2, $3, false, $4)
    ON CONFLICT (email, wilayah_id) 
    DO UPDATE SET token_konfirmasi = EXCLUDED.token_konfirmasi, status_terkonfirmasi = false
    RETURNING id, email, wilayah_id, status_terkonfirmasi;
  `;

  await pool.query(query, [email.toLowerCase().trim(), wilayahId, tokenKonfirmasi, tokenUnsubscribe]);

  // Kirim email konfirmasi (Double Opt-In untuk keamanan)
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const linkKonfirmasi = `${appUrl}/api/notifikasi/konfirmasi/${tokenKonfirmasi}`;
  const linkUnsub = `${appUrl}/api/notifikasi/unsubscribe/${tokenUnsubscribe}`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 550px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb;">🌊 Konfirmasi Langganan SIRANDU</h2>
      <p>Halo warga Kota Jambi,</p>
      <p>Anda mendaftarkan email ini untuk menerima peringatan dini otomatis bencana banjir di wilayah <b>Kelurahan ${namaKel}</b>.</p>
      <p style="margin: 25px 0;">
        <a href="${linkKonfirmasi}" style="background-color: #2563eb; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Aktifkan Peringatan Dini
        </a>
      </p>
      <p style="font-size: 11px; color: #64748b;">
        Jika Anda tidak merasa mendaftar, abaikan email ini atau <a href="${linkUnsub}">batalkan di sini</a>. Privasi Anda terjaga.
      </p>
    </div>
  `;

  await kirimEmailAman({
    from: '"SIRANDU Kota Jambi" <no-reply@sirandu.jambikota.go.id>',
    to: email,
    subject: `Konfirmasi Peringatan Dini Banjir - Kel. ${namaKel}`,
    html: htmlContent,
  });

  return {
    email: email,
    kelurahan: namaKel,
    message: "Email konfirmasi telah dikirimkan. Silakan cek inbox email Anda.",
  };
};

/**
 * F06: Konfirmasi Token Langganan
 */
const konfirmasiLangganan = async (token) => {
  const query = `
    UPDATE pelanggan_notifikasi
    SET status_terkonfirmasi = true, token_konfirmasi = NULL
    WHERE token_konfirmasi = $1
    RETURNING email, wilayah_id;
  `;
  const res = await pool.query(query, [token]);
  if (res.rows.length === 0) throw new Error("Token konfirmasi tidak valid atau sudah kadaluarsa.");
  return res.rows[0];
};

/**
 * F06: Unsubscribe Email (Privasi Terjaga)
 */
const unsubscribeWarga = async (tokenUnsubscribe) => {
  const query = `DELETE FROM pelanggan_notifikasi WHERE token_unsubscribe = $1 RETURNING email`;
  const res = await pool.query(query, [tokenUnsubscribe]);
  if (res.rows.length === 0) throw new Error("Token unsubscribe tidak valid.");
  return res.rows[0];
};

/**
 * F06: Pemicu Email Otomatis saat Terjadi Eskalasi Status (Misal: Normal -> Waspada / Siaga)
 */
const kirimEmailEskalasi = async (wilayahId, statusLama, statusBaru, curahHujan) => {
  // 1. Ambil data pelanggan yang terkonfirmasi
  const qPelanggan = `
    SELECT p.email, p.token_unsubscribe, w.nama_kelurahan, w.nama_kecamatan
    FROM pelanggan_notifikasi p
    JOIN wilayah_administrasi w ON p.wilayah_id = w.id
    WHERE p.wilayah_id = $1 AND p.status_terkonfirmasi = true;
  `;
  const { rows: penerima } = await pool.query(qPelanggan, [wilayahId]);

  if (penerima.length === 0) {
    console.log(`[NOTIF] Tidak ada pelanggan terkonfirmasi di wilayah ID ${wilayahId}.`);
    return;
  }

  const kelurahan = penerima[0].nama_kelurahan;
  const kecamatan = penerima[0].nama_kecamatan;
  const subjek = `⚠️ [PERINGATAN DINI] Status Wilayah ${kelurahan} Naik Menjadi ${statusBaru.toUpperCase()}!`;

  // 2. Ambil posko pengungsian aktif terdekat di kelurahan ini
  const qPosko = `
    SELECT nama_posko, alamat, kontak_pj
    FROM posko_pengungsian
    WHERE status_aktif = true
    ORDER BY kapasitas_jiwa DESC
    LIMIT 1;
  `;
  const resPosko = await pool.query(qPosko);
  const posko = resPosko.rows[0] || null;

  // 3. Blast email ke seluruh pelanggan
  for (const p of penerima) {
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 580px; margin: auto; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
        <div style="background-color: #ef4444; color: white; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 16px;">
          🚨 PERINGATAN DINI BANJIR KOTA JAMBI - STATUS: ${statusBaru.toUpperCase()}
        </div>
        <p style="margin-top: 15px;">Halo Warga <b>Kelurahan ${kelurahan}, Kec. ${kecamatan}</b>,</p>
        <p>Sensor pemantauan SIRANDU mendeteksi eskalasi curah hujan sebesar <b>${curahHujan} mm</b>. Status kewaspadaan di wilayah Anda resmi dinaikkan dari <b>${statusLama}</b> menjadi <b style="color: #ef4444;">${statusBaru}</b>.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin: 15px 0;">
          <h4 style="margin: 0 0 8px 0; color: #1e293b;">Tindakan Mitigasi yang Harus Dilakukan:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
            <li>Pindahkan dokumen berharga dan perabotan ke tempat yang lebih tinggi.</li>
            <li>Waspadai luapan parit dan genangan air di jalan raya.</li>
            <li>Matikan instalasi listrik bila air mulai menggenangi lantai rumah.</li>
          </ul>
        </div>

        ${posko ? `
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 6px; margin: 15px 0;">
          <h4 style="margin: 0 0 5px 0; color: #1e40af;">📍 Posko Pengungsian Terdekat:</h4>
          <p style="margin: 2px 0; font-size: 13px;"><b>${posko.nama_posko}</b></p>
          <p style="margin: 2px 0; font-size: 12px; color: #475569;">${posko.alamat}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px;">Kontak Darurat: <b>${posko.kontak_pj || "BPBD Kota Jambi"}</b></p>
        </div>` : ''}

        <p style="margin-top: 20px;">
          <a href="http://localhost:3000/peta" style="background-color: #2563eb; color: white; padding: 8px 14px; text-decoration: none; border-radius: 5px; font-size: 13px; font-weight: bold;">
            Buka Peta & Rute Evakuasi
          </a>
        </p>

        <hr style="margin-top: 25px; border: 0; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 10px; color: #94a3b8;">
          Email ini dikirim otomatis oleh Sistem SIRANDU Pemkot Jambi. 
          <a href="http://localhost:3000/api/notifikasi/unsubscribe/${p.token_unsubscribe}">Berhenti Berlangganan</a>.
        </p>
      </div>
    `;

    await kirimEmailAman({
      from: '"BPBD & SIRANDU Kota Jambi" <alert@sirandu.jambikota.go.id>',
      to: p.email,
      subject: subjek,
      html: htmlBody,
    });
  }

  // 4. Catat Audit Trail ke tabel log_notifikasi
  await pool.query(
    "INSERT INTO log_notifikasi (wilayah_id, status_sebelumnya, status_baru, subjek_email, jumlah_penerima) VALUES ($1, $2, $3, $4, $5)",
    [wilayahId, statusLama, statusBaru, subjek, penerima.length]
  );
};

module.exports = {
  subscribeWarga,
  konfirmasiLangganan,
  unsubscribeWarga,
  kirimEmailEskalasi,
};
