// routes/users.js
const express = require("express");
const router = express.Router();
const { getUsers, addUser } = require("../controllers/usersController");

router.get("/", getUsers);
router.post("/", addUser);

module.exports = router;
