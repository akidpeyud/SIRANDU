const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { JWT_SECRET } = require("../middleware/authMiddleware");

/**
 * POST /api/admin/login
 * Autentikasi petugas/admin BPBD Kota Jambi dan menerbitkan JWT token
 */
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username dan password wajib diisi.",
      });
    }

    const query = `
      SELECT id, username, password_hash, nama_lengkap, role, is_active 
      FROM admin_users 
      WHERE username = $1;
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Kombinasi username atau password salah.",
      });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: "Akun administrator ini telah dinonaktifkan.",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Kombinasi username atau password salah.",
      });
    }

    // Terbitkan JWT Token (masa berlaku 24 jam)
    const payload = {
      id: admin.id,
      username: admin.username,
      nama_lengkap: admin.nama_lengkap,
      role: admin.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    return res.status(200).json({
      success: true,
      message: "Login berhasil. Selamat bertugas di SIRANDU Command Center!",
      token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        nama_lengkap: admin.nama_lengkap,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Error loginAdmin:", err.message);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan internal pada server",
      error: err.message,
    });
  }
};

/**
 * GET /api/admin/me
 * Mengambil informasi akun administrator yang sedang login
 */
const getAdminProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin,
  });
};

module.exports = {
  loginAdmin,
  getAdminProfile,
};
