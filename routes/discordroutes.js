const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/isAuthenticated");
const discordConnectController = require("../controlers/discordconnectcontroller");

router.get("/discord", isAuthenticated, discordConnectController.redirect);
router.get("/discord/callback", discordConnectController.callback);

module.exports = router;
