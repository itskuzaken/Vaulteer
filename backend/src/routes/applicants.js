const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const {
  listApplicants,
  approveApplicant,
  rejectApplicant,
} = require("../repositories/applicantRepository");

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await listApplicants());
  })
);
router.put(
  "/:id/approve",
  asyncHandler(async (req, res) => {
    res.json(await approveApplicant(req.params.id));
  })
);
router.put(
  "/:id/reject",
  asyncHandler(async (req, res) => {
    res.json(await rejectApplicant(req.params.id));
  })
);

module.exports = router;
