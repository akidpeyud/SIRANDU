const crypto = require("crypto");
const pool = require("../config/db");
const { kirimEmailVerifikasi } = require("../services/notifikasiService");

/**
 * 1. POST /api/subscribe
 * Mendaftarkan email warga untuk menerima peringatan banjir per kecamatan
 */
const subscribeNotifikasi = async (req, res) => {
  try {
    const { email, id_kecamatan, nama_kecamatan } = req.body;

    if (!email || (!id_kecamatan && !nama_kecamatan)) {
      return res.status(400).json({
        success: false,
        message: "Email dan Kecamatan (id_kecamatan / nama_kecamatan) wajib diisi.",
      });
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format alamat email tidak valid.",
      });
    }

    // Cari ID kecamatan jika yang dikirimkan adalah nama
    let targetKecId = id_kecamatan;
    let targetKecNama = nama_kecamatan;

    if (!targetKecId && targetKecNama) {
      const resKec = await pool.query("SELECT id, nama_kecamatan FROM kecamatan WHERE LOWER(nama_kecamatan) = LOWER($1)", [targetKecNama]);
      if (resKec.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Kecamatan tidak ditemukan di Kota Jambi." });
      }
      targetKecId = resKec.rows[0].id;
      targetKecNama = resKec.rows[0].nama_kecamatan;
    } else {
      const resKec = await pool.query("SELECT nama_kecamatan FROM kecamatan WHERE id = $1", [targetKecId]);
      if (resKec.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Kecamatan tidak ditemukan di Kota Jambi." });
      }
      targetKecNama = resKec.rows[0].nama_kecamatan;
    }

    // Buat token verifikasi & token unsubscribe unik
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    // Simpan atau update pelanggan
    const insertSql = `
      INSERT INTO pelanggan_notifikasi (
        email, id_kecamatan, wilayah_id, token_verifikasi, token_konfirmasi, 
        token_unsubscribe, is_verified, status_terkonfirmasi, created_at
      )
      VALUES ($1, $2, $2, $3, $3, $4, FALSE, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE
      SET id_kecamatan = EXCLUDED.id_kecamatan,
          wilayah_id = EXCLUDED.wilayah_id,
          token_verifikasi = EXCLUDED.token_verifikasi,
          token_konfirmasi = EXCLUDED.token_konfirmasi,
          token_unsubscribe = EXCLUDED.token_unsubscribe,
          is_verified = FALSE,
          status_terkonfirmasi = FALSE
      RETURNING id, email, id_kecamatan, is_verified;
    `;

    await pool.query(insertSql, [email.toLowerCase().trim(), targetKecId, verificationToken, unsubscribeToken]);

    // Kirim email verifikasi
    await kirimEmailVerifikasi(email.toLowerCase().trim(), verificationToken, targetKecNama);

    res.status(200).json({
      success: true,
      message: `Tautan verifikasi telah dikirimkan ke email ${email}. Silakan periksa kotak masuk untuk mengaktifkan peringatan banjir di Kecamatan ${targetKecNama}.`,
      token_verifikasi_debug: verificationToken, // Mempermudah pengujian lokal
    });
  } catch (err) {
    console.error("Error subscribeNotifikasi:", err.message);
    res.status(500).json({ success: false, message: "Gagal mendaftarkan email notifikasi", error: err.message });
  }
};

/**
 * 2. GET /api/verify/:token
 * Mengonfirmasi verifikasi email warga
 */
const verifySubscription = async (req, res) => {
  try {
    const { token } = req.params;

    const query = `
      UPDATE pelanggan_notifikasi
      SET is_verified = TRUE,
          status_terkonfirmasi = TRUE
      WHERE token_verifikasi = $1 OR token_konfirmasi = $1
      RETURNING id, email, id_kecamatan;
    `;
    const result = await pool.query(query, [token]);

    if (result.rows.length === 0) {
      return res.status(404).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">❌ Tautan Verifikasi Tidak Valid atau Kadaluwarsa</h2>
          <p>Silakan mendaftar ulang di portal SIRANDU Kota Jambi.</p>
        </div>
      `);
    }

    const pelanggan = result.rows[0];

    // Ambil nama kecamatan
    const resKec = await pool.query("SELECT nama_kecamatan FROM kecamatan WHERE id = $1", [pelanggan.id_kecamatan]);
    const namaKec = resKec.rows.length > 0 ? resKec.rows[0].nama_kecamatan : "Kota Jambi";

    // Kirim respons HTML ramah atau JSON jika diminta via API client
    if (req.headers["accept"] && req.headers["accept"].includes("application/json")) {
      return res.status(200).json({
        success: true,
        message: `Email ${pelanggan.email} berhasil diverifikasi untuk Kecamatan ${namaKec}.`,
      });
    }

    res.status(200).send(`
      <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 50px auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <div style="font-size: 50px; margin-bottom: 10px;">✅</div>
        <h2 style="color: #10b981; margin: 0 0 10px 0;">Verifikasi Berhasil!</h2>
        <p style="color: #475569; font-size: 14px;">
          Email <b>${pelanggan.email}</b> kini aktif menerima peringatan dini otomatis untuk <b>Kecamatan ${namaKec}</b>.
        </p>
        <div style="margin-top: 25px;">
          <a href="/peta" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">
            Kembali ke Peta Spasial SIRANDU
          </a>
        </div>
      </div>
    `);
  } catch (err) {
    console.error("Error verifySubscription:", err.message);
    res.status(500).json({ success: false, message: "Gagal memverifikasi email", error: err.message });
  }
};

/**
 * 3. DELETE /api/unsubscribe (atau GET untuk kemudahan klik dari email)
 * Menghapus data email pelanggan sesuai hak privasi data
 */
const unsubscribeNotifikasi = async (req, res) => {
  try {
    const email = req.query.email || req.body?.email;
    const token = req.query.token || req.body?.token;

    if (!email && !token) {
      return res.status(400).json({
        success: false,
        message: "Email atau token konfirmasi diperlukan untuk membatalkan langganan.",
      });
    }

    let query = "DELETE FROM pelanggan_notifikasi WHERE ";
    let values = [];

    if (email) {
      values.push(email.toLowerCase().trim());
      query += `email = $${values.length}`;
    } else {
      values.push(token);
      query += `(token_verifikasi = $1 OR token_konfirmasi = $1)`;
    }

    query += " RETURNING email;";

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data pelanggan tidak ditemukan atau sudah dihapus sebelumnya.",
      });
    }

    res.status(200).json({
      success: true,
      message: `Email ${result.rows[0].email} berhasil dihapus dari daftar notifikasi peringatan banjir sesuai kebijakan privasi.`,
    });
  } catch (err) {
    console.error("Error unsubscribeNotifikasi:", err.message);
    res.status(500).json({ success: false, message: "Gagal membatalkan langganan", error: err.message });
  }
};

/**
 * 4. GET /api/notifikasi/log
 * Melihat riwayat log pengiriman notifikasi otomatis
 */
const getLogNotifikasi = async (req, res) => {
  try {
    const query = `
      SELECT 
        l.id,
        k.nama_kecamatan,
        l.status_sebelumnya,
        l.status_baru,
        l.subjek_email,
        l.jumlah_terkirim,
        l.status_pengiriman,
        to_char(l.waktu, 'YYYY-MM-DD HH24:MI:SS') AS waktu_pengiriman
      FROM log_notifikasi l
      LEFT JOIN kecamatan k ON l.id_kecamatan = k.id
      ORDER BY l.waktu DESC
      LIMIT 50;
    `;
    const result = await pool.query(query);
    res.status(200).json({ success: true, total: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal memuat log notifikasi", error: err.message });
  }
};

module.exports = {
  subscribeNotifikasi,
  verifySubscription,
  unsubscribeNotifikasi,
  getLogNotifikasi,
};
