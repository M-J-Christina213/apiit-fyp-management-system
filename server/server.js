const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const supervisorsRoute = require("./routes/supervisors");
const studentsRoute = require("./routes/students");
const batchesRoute = require("./routes/batches");
const usersRoute = require("./routes/users");
const assessorsRoute = require("./routes/assessors");
const templateRoutes = require("./routes/templateRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const logsheetRoutes = require("./routes/logsheetRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const externalSupervisorRoutes = require("./routes/externalSupervisors");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files (logsheets, signatures, proposals)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use("/api/auth", authRoutes);

app.use("/api/supervisors", supervisorsRoute);
app.use("/api/students", studentsRoute);
app.use("/api/batches", batchesRoute);
app.use("/api/users", usersRoute);
app.use("/api/assessors", assessorsRoute);
app.use("/api/templates", templateRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/logsheets", logsheetRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/externalSupervisors", externalSupervisorRoutes);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});