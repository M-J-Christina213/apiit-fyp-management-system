const express = require("express");
const {
    submitProposal,
    getStudentProposals,
    updateProposalStatus,
    getAllProposals,
    getSupervisorRequests,
    approveProposal,
    rejectProposal,
    confirmSupervisor
} = require("../controllers/proposalController.js");

const router = express.Router();

router.post("/", submitProposal);
router.get("/student/:id", getStudentProposals);
router.patch("/:id/status", updateProposalStatus);
router.get("/all", getAllProposals);
router.post("/", submitProposal);

router.get("/all", getAllProposals);

router.get("/student/:id", getStudentProposals);

router.get("/supervisor/:id", getSupervisorRequests);

router.patch("/:id/approve", approveProposal);

router.patch("/:id/reject", rejectProposal);

router.patch("/:id/confirm", confirmSupervisor);

module.exports = router;