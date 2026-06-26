const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const supervisorsRoute = require("./routes/supervisors");
const studentsRoute = require("./routes/students");
const proposalsRoute = require("./routes/proposals");
const batchesRoute = require("./routes/batches");
const usersRoute = require("./routes/users");
const assessorsRoute = require("./routes/assessors");
const templateRoutes = require("./routes/templateRoutes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/supervisors", supervisorsRoute);
app.use("/api/students", studentsRoute);
app.use("/api/proposals", proposalsRoute);
app.use("/api/batches", batchesRoute);
app.use("/api/users", usersRoute);
app.use("/api/assessors", assessorsRoute);
app.use("/api/templates", templateRoutes);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});