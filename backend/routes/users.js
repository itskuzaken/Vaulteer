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
const { writeLimiter } = require("../middleware/rateLimiter");

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
router.post("/", writeLimiter, addUser);

// Update user status (admin only)
router.patch("/:id/status", authenticate, writeLimiter, updateUserStatus);

// Update user role (admin only)
router.patch("/:id/role", authenticate, writeLimiter, updateUserRole);

// Update user activity (self or admin)
router.patch("/:id/activity", authenticate, writeLimiter, updateUserActivity);

module.exports = router;
