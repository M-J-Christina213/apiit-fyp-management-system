const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const supervisorsRoute = require("./routes/supervisors");
const studentsRoute = require("./routes/students");
const proposalsRoute = require("./routes/proposals");
const batchesRoute = require("./routes/batches");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/supervisors", supervisorsRoute);
app.use("/api/students", studentsRoute);
app.use("/api/proposals", proposalsRoute);
app.use("/api/batches", batchesRoute);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});