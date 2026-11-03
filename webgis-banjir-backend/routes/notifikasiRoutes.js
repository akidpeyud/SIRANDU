const express = require("express");
const router = express.Router();
const {
  subscribe,
  konfirmasi,
  unsubscribe,
} = require("../controllers/notifikasiController");

// F06: Subscribe Peringatan Dini Banjir
router.post("/subscribe", subscribe);

// F06: Konfirmasi Token
router.get("/konfirmasi/:token", konfirmasi);

// F06: Unsubscribe Warga (Privasi)
router.get("/unsubscribe/:token", unsubscribe);

module.exports = router;
