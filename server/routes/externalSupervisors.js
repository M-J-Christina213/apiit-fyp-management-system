const express = require("express");

const router = express.Router();

const {

    registerExternalSupervisor,
    getPendingExternalSupervisors,
    approveExternalSupervisor,
    rejectExternalSupervisor

} = require("../controllers/externalSupervisorController");


// ======================================================
// External Supervisor Registration
// POST /api/external-supervisors/register
// ======================================================

router.post(
    "/register",
    registerExternalSupervisor
);


// ======================================================
// Get All Registration Requests
// GET /api/external-supervisors/pending
// ======================================================

router.get(
    "/pending",
    getPendingExternalSupervisors
);


// ======================================================
// Approve Registration
// PUT /api/external-supervisors/:id/approve
// ======================================================

router.put(
    "/:id/approve",
    approveExternalSupervisor
);


// ======================================================
// Reject Registration
// PUT /api/external-supervisors/:id/reject
// ======================================================

router.put(
    "/:id/reject",
    rejectExternalSupervisor
);


module.exports = router;