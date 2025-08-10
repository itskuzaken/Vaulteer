// server.js
const express = require("express");
const cors = require("cors");
const usersRouter = require("./routes/users");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

app.use("/api/users", usersRouter);

app.get("/", (req, res) => res.json({ message: "Vaulteer backend running" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// railway deployment
