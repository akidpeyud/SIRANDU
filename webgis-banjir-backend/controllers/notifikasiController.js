const notifikasiService = require("../services/notifikasiService");

// 1. Subscribe Email Warga (F06)
const subscribe = async (req, res) => {
  try {
    const { email, wilayah_id } = req.body;
    const result = await notifikasiService.subscribeWarga(email, wilayah_id);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// 2. Konfirmasi Email Langganan
const konfirmasi = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await notifikasiService.konfirmasiLangganan(token);
    res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: #16a34a;">✅ Langganan Peringatan Dini Berhasil Diaktifkan!</h2>
        <p>Email <b>${result.email}</b> sekarang akan menerima notifikasi otomatis bila status siaga di kelurahan Anda meningkat.</p>
        <p><a href="/peta" style="color: #2563eb; text-decoration: none; font-weight: bold;">← Kembali ke Peta SIRANDU</a></p>
      </div>
    `);
  } catch (err) {
    res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: #dc2626;">❌ Konfirmasi Gagal</h2>
        <p>${err.message}</p>
      </div>
    `);
  }
};

// 3. Unsubscribe Email (Privasi Warga)
const unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await notifikasiService.unsubscribeWarga(token);
    res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: #2563eb;">Berhenti Berlangganan Berhasil</h2>
        <p>Email <b>${result.email}</b> telah dihapus dari sistem notifikasi SIRANDU. Data Anda aman.</p>
        <p><a href="/peta" style="color: #2563eb; text-decoration: none; font-weight: bold;">← Kembali ke Peta</a></p>
      </div>
    `);
  } catch (err) {
    res.status(400).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: #dc2626;">❌ Gagal Unsubscribe</h2>
        <p>${err.message}</p>
      </div>
    `);
  }
};

module.exports = {
  subscribe,
  konfirmasi,
  unsubscribe,
};
