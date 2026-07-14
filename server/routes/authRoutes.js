const express = require("express");
const router = express.Router();

const {
    login,
    azureLogin,
    azureCallback
} = require("../controllers/authController");


// Existing normal login
router.post("/login", login);


// Microsoft Entra ID SPA Login
router.post("/azure/login", azureLogin);

module.exports = router;