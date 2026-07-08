const express = require("express");

const router = express.Router();


const {

    getExternalSupervisorRequests,
    approveExternalSupervisor,
    rejectExternalSupervisor,
    getPendingRequests

} = require("../controllers/adminController");



router.get(
    "/external-supervisor-requests",
    getExternalSupervisorRequests
);



router.put(
    "/external-supervisor-requests/:id/approve",
    approveExternalSupervisor
);



router.put(
    "/external-supervisor-requests/:id/reject",
    rejectExternalSupervisor
);

router.get(
    "/pending",
    getPendingRequests
);


module.exports = router;