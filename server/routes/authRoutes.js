const express = require("express");
const router = express.Router();

const {
    login,
    azureLogin,
    azureCallback
} = require("../controllers/authController");


// Existing normal login
router.post("/login", login);


// Microsoft Entra ID Backend Login Flow
router.get("/azure/login", azureLogin);
router.post("/azure/callback", azureCallback);

module.exports = router;