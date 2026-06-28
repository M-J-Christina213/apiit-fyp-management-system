const express = require("express");
const {
    submitProposal,
    getStudentProposals,
    updateProposalStatus,
    getAllProposals
} = require("../controllers/proposalController.js");

const router = express.Router();

router.post("/", submitProposal);
router.get("/student/:id", getStudentProposals);
router.patch("/:id/status", updateProposalStatus);
router.get("/all", getAllProposals);

module.exports = router;