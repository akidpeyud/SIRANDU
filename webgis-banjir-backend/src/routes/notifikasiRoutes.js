const express = require("express");
const router = express.Router();
const {
  subscribeNotifikasi,
  verifySubscription,
  unsubscribeNotifikasi,
  getLogNotifikasi,
} = require("../controllers/notifikasiController");

// F06 Notifikasi Email
router.post("/subscribe", subscribeNotifikasi);
router.get("/verify/:token", verifySubscription);
router.delete("/unsubscribe", unsubscribeNotifikasi);
router.get("/unsubscribe", unsubscribeNotifikasi); // Mendukung klik langsung via link di email
router.get("/log", getLogNotifikasi);

module.exports = router;
