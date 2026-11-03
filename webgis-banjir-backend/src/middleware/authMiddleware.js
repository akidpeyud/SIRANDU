const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "sirandu_secret_key_jambi_smart_city_2026";

/**
 * Middleware untuk memverifikasi token JWT Administrator
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak: Token autentikasi Bearer tidak ditemukan atau tidak valid.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
      error: err.message,
    });
  }
};

module.exports = {
  verifyToken,
  JWT_SECRET,
};
