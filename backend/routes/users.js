const express = require("express");
const router = express.Router();
const {
  getUsers,
  getVolunteers,
  getStaffs,
  getApplicants,
  getAdmins,
  addUser,
} = require("../controllers/usersController");

// Get all users
router.get("/", getUsers);

// Get volunteers specifically
router.get("/volunteers", getVolunteers);

// Get all staffs specifically
router.get("/staffs", getStaffs);

// Get all applicants specifically
router.get("/applicants", getApplicants);

// Get all admins specifically
router.get("/admins", getAdmins);

// Add new user
router.post("/", addUser);

module.exports = router;
