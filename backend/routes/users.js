const express = require("express");
const router = express.Router();
const {
  getUsers,
  getVolunteers,
  getStaffs,
  getApplicants,
  getAdmins,
  addUser,
  updateUserStatus,
  updateUserRole,
  updateUserActivity,
} = require("../controllers/usersController");
const { authenticate } = require("../middleware/auth");

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

// Update user status (admin only)
router.patch("/:id/status", authenticate, updateUserStatus);

// Update user role (admin only)
router.patch("/:id/role", authenticate, updateUserRole);

// Update user activity (self or admin)
router.patch("/:id/activity", authenticate, updateUserActivity);

module.exports = router;
