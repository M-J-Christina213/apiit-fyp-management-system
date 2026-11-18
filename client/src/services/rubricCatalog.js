/**
 * Frontend FYP Rubric Catalog
 * Exact criteria, weights and component mappings confirmed by Academic Board.
 */

export const RUBRIC_CATALOG = {
    PREP_TOPIC: {
        key: "PREP_TOPIC",
        name: "Topic Initiation and Supervisor Confirmation",
        semester: "Preparation",
        component: "Unmarked",
        maxMarks: 0,
        criteria: []
    },
    SEM1_LR: {
        key: "SEM1_LR",
        name: "Literature Review Checkpoint",
        semester: "Semester 1",
        component: "Report",
        maxMarks: 5.0,
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
        criteria: [
            { id: "c1", name: "Presentation structure and timing", maxScore: 1.0 },
            { id: "c2", name: "Problem, gap, aim and contribution explanation", maxScore: 2.0 },
            { id: "c3", name: "Technical and methodological defence", maxScore: 3.0 },
            { id: "c4", name: "Evaluation and results defence", maxScore: 2.0 },
            { id: "c5", name: "Independence, ownership and professionalism", maxScore: 2.0 }
        ]
    }
};

export const COMPONENT_TOTALS = {
    Proposal: 20.0, // Final Proposal (5) + Midpoint (15)
    Report: 60.0,   // Literature Review (5) + PoC (10) + Final Report (45)
    "Viva Presentation": 20.0, // Demo Day (10) + Final Viva (10)
    Overall: 100.0
};
