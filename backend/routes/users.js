const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/asyncHandler");
const {
  getByUid,
  listByRole,
  create,
  update,
  remove,
} = require("../repositories/userRepository");

router.get(
  "/roles/:role",
  asyncHandler(async (req, res) => {
    const rows = await listByRole(req.params.role);
    res.json(rows);
  })
);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = await create(req.body);
    res.status(201).json(user);
  })
);
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const updated = await update(req.params.id, req.body);
    res.json(updated);
  })
);
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const out = await remove(req.params.id);
    res.json(out);
  })
);
module.exports = router;
