/**
 * Approved Academic FYP Rubric Catalog
 * Exact criteria, weights and component mappings confirmed by Academic Board.
 */

const RUBRIC_CATALOG = {
    PREP_TOPIC: {
        key: "PREP_TOPIC",
        name: "Topic Initiation and Supervisor Confirmation",
        semester: "Preparation",
        component: "Unmarked",
        maxMarks: 0,
        markingMode: "FORMATIVE", // Supervisor guides, unmarked
        criteria: []
    },
    SEM1_LR: {
        key: "SEM1_LR",
        name: "Literature Review Checkpoint",
        semester: "Semester 1",
        component: "Report",
        maxMarks: 5.0,
        markingMode: "SINGLE_MARKER", // Supervisor or Nominated Reviewer
        criteria: [
            { id: "c1", name: "Coverage of problem domain and research context", maxScore: 1.0 },
            { id: "c2", name: "Critical review of related work", maxScore: 1.25 },
            { id: "c3", name: "Gap synthesis and novelty justification", maxScore: 1.25 },
            { id: "c4", name: "Technology, dataset and evaluation awareness", maxScore: 0.75 },
            { id: "c5", name: "Academic writing, referencing and presentation quality", maxScore: 0.75 }
        ]
    },
    SEM1_PROP: {
        key: "SEM1_PROP",
        name: "Final Project Proposal",
        semester: "Semester 1",
        component: "Proposal",
        maxMarks: 5.0,
        markingMode: "SINGLE_MARKER", // Supervisor
        criteria: [
            { id: "c1", name: "Problem background, problem definition and motivation", maxScore: 1.0 },
            { id: "c2", name: "Research gap and contribution", maxScore: 1.0 },
            { id: "c3", name: "Aim, objectives and research questions", maxScore: 1.0 },
            { id: "c4", name: "Preliminary methodology and feasibility", maxScore: 1.0 },
            { id: "c5", name: "Project plan and academic presentation quality", maxScore: 1.0 }
        ]
    },
    SEM2_POC: {
        key: "SEM2_POC",
        name: "Proof of Concept (PoC)",
        semester: "Semester 2",
        component: "Report",
        maxMarks: 10.0,
        markingMode: "SINGLE_MARKER", // Supervisor or Nominated Reviewer
        criteria: [
            { id: "c1", name: "Feasibility of the core technical idea", maxScore: 3.0 },
            { id: "c2", name: "Use of appropriate data, tools or resources", maxScore: 2.0 },
            { id: "c3", name: "Initial results or observable behaviour", maxScore: 2.0 },
            { id: "c4", name: "Alignment with research gap and methodology", maxScore: 2.0 },
            { id: "c5", name: "Reflection on limitations and next steps", maxScore: 1.0 }
        ]
    },
    SEM2_MID: {
        key: "SEM2_MID",
        name: "Midpoint Assessment",
        semester: "Semester 2",
        component: "Proposal",
        maxMarks: 15.0,
        markingMode: "SINGLE_MARKER", // Assessor
        criteria: [
            { id: "c1", name: "Refined research problem, gap and methodology", maxScore: 3.0 },
            { id: "c2", name: "Design of the proposed solution or pipeline", maxScore: 3.0 },
            { id: "c3", name: "Implementation progress", maxScore: 3.0 },
            { id: "c4", name: "Evaluation plan and risk handling", maxScore: 3.0 },
            { id: "c5", name: "Progress evidence and professionalism", maxScore: 3.0 }
        ]
    },
    SEM3_DEMO: {
        key: "SEM3_DEMO",
        name: "Prototype Review / Demo Day",
        semester: "Semester 3",
        component: "Viva Presentation",
        maxMarks: 10.0,
        markingMode: "BATCH_CONFIG", // Supervisor, Assessor or Joint according to batch configuration
        criteria: [
            { id: "c1", name: "Integrated prototype, model or pipeline demonstration", maxScore: 3.0 },
            { id: "c2", name: "Demonstration clarity and objective alignment", maxScore: 2.0 },
            { id: "c3", name: "Technical explanation and implementation ownership", maxScore: 2.0 },
            { id: "c4", name: "Testing, evaluation readiness and responses to questions", maxScore: 2.0 },
            { id: "c5", name: "Known limitations and final improvement plan", maxScore: 1.0 }
        ]
    },
    SEM3_FINAL_REP: {
        key: "SEM3_FINAL_REP",
        name: "Final Report + Prototype",
        semester: "Semester 3",
        component: "Report",
        maxMarks: 45.0,
        markingMode: "JOINT_MARKERS", // Supervisor and Assessor (Reconciliation required)
        criteria: [
            { id: "c1", name: "Research problem, gap and contribution", maxScore: 5.0 },
            { id: "c2", name: "Literature review quality and synthesis", maxScore: 8.0 },
            { id: "c3", name: "Methodology and design justification", maxScore: 6.0 },
            { id: "c4", name: "Implementation / prototype quality", maxScore: 10.0 },
            { id: "c5", name: "Testing, evaluation and analysis", maxScore: 10.0 },
            { id: "c6", name: "Report structure, academic writing and referencing", maxScore: 4.0 },
            { id: "c7", name: "Reflection, limitations and future work", maxScore: 2.0 }
        ]
    },
    SEM3_FINAL_VIVA: {
        key: "SEM3_FINAL_VIVA",
        name: "Final Viva Presentation and Defence",
        semester: "Semester 3",
        component: "Viva Presentation",
        maxMarks: 10.0,
        markingMode: "JOINT_MARKERS", // Supervisor and Assessor (Reconciliation required)
        criteria: [
            { id: "c1", name: "Presentation structure and timing", maxScore: 1.0 },
            { id: "c2", name: "Problem, gap, aim and contribution explanation", maxScore: 2.0 },
            { id: "c3", name: "Technical and methodological defence", maxScore: 3.0 },
            { id: "c4", name: "Evaluation and results defence", maxScore: 2.0 },
            { id: "c5", name: "Independence, ownership and professionalism", maxScore: 2.0 }
        ]
    }
};

/**
 * Standard 8-Milestone Template Sequence
 */
const APPROVED_FYP_TEMPLATE = [
    {
        milestone_code: "PREP_TOPIC",
        name: "Topic Initiation & Supervisor Confirmation",
        semester: "Preparation",
        component: "Unmarked",
        type: "FORMATIVE",
        max_marks: 0,
        rubric_key: "PREP_TOPIC",
        order_index: 0,
        student_instructions: "Discuss your research area with prospective supervisors and complete formal confirmation."
    },
    {
        milestone_code: "SEM1_LR",
        name: "Literature Review Checkpoint",
        semester: "Semester 1",
        component: "Report",
        type: "SUMMATIVE",
        max_marks: 5.0,
        rubric_key: "SEM1_LR",
        order_index: 1,
        student_instructions: "Submit your comprehensive literature synthesis identifying research gaps and novelty."
    },
    {
        milestone_code: "SEM1_PROP",
        name: "Final Project Proposal",
        semester: "Semester 1",
        component: "Proposal",
        type: "SUMMATIVE",
        max_marks: 5.0,
        rubric_key: "SEM1_PROP",
        order_index: 2,
        student_instructions: "Submit final proposal with clear aims, research questions, methodology, and work plan."
    },
    {
        milestone_code: "SEM2_POC",
        name: "Proof of Concept (PoC)",
        semester: "Semester 2",
        component: "Report",
        type: "SUMMATIVE",
        max_marks: 10.0,
        rubric_key: "SEM2_POC",
        order_index: 3,
        student_instructions: "Submit evidence demonstrating technical feasibility, initial data pipeline, and observable behaviour."
    },
    {
        milestone_code: "SEM2_MID",
        name: "Midpoint Assessment",
        semester: "Semester 2",
        component: "Proposal",
        type: "SUMMATIVE",
        max_marks: 15.0,
        rubric_key: "SEM2_MID",
        order_index: 4,
        student_instructions: "Midpoint submission and defence demonstrating solution design, implementation progress, and risk handling."
    },
    {
        milestone_code: "SEM3_DEMO",
        name: "Prototype Review / Demo Day",
        semester: "Semester 3",
        component: "Viva Presentation",
        type: "SUMMATIVE",
        max_marks: 10.0,
        rubric_key: "SEM3_DEMO",
        order_index: 5,
        student_instructions: "Live working demonstration of prototype, technical Q&A, and evaluation readiness."
    },
    {
        milestone_code: "SEM3_FINAL_REP",
        name: "Final Report + Prototype",
        semester: "Semester 3",
        component: "Report",
        type: "SUMMATIVE",
        max_marks: 45.0,
        rubric_key: "SEM3_FINAL_REP",
        order_index: 6,
        student_instructions: "Official submission of the complete FYP dissertation, technical implementation, and empirical evaluation."
    },
    {
        milestone_code: "SEM3_FINAL_VIVA",
        name: "Final Viva Presentation and Defence",
        semester: "Semester 3",
        component: "Viva Presentation",
        type: "SUMMATIVE",
        max_marks: 10.0,
        rubric_key: "SEM3_FINAL_VIVA",
        order_index: 7,
        student_instructions: "Final viva presentation, methodological defence, and academic oral examination."
    }
];

function getRubric(rubricKey) {
    return RUBRIC_CATALOG[rubricKey] || null;
}

function getAllRubrics() {
    return RUBRIC_CATALOG;
}

module.exports = {
    RUBRIC_CATALOG,
    APPROVED_FYP_TEMPLATE,
    getRubric,
    getAllRubrics
};
