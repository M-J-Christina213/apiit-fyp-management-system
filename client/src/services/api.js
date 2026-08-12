import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
});

// GET DATA
export const getSupervisors = () => API.get("/supervisors");
export const uploadSupervisors = (data) => API.post("/supervisors/upload", data);
export const clearAllSupervisors = () => API.delete("/supervisors");
export const updateSupervisor = (id, data) => API.put(`/supervisors/${id}`, data);
export const deleteSupervisor = (id) => API.delete(`/supervisors/${id}`);
export const createSupervisor = (data) =>
    API.post("/supervisors", data);
export const getStudents = (params = {}) => API.get("/students", { params });
export const allocateSupervisor = (id, data) => API.post(`/students/${id}/allocate-supervisor`, data);
export const allocateAssessor = (id, data) => API.post(`/students/${id}/allocate-assessor`, data);
export const getStudentProposals = (studentId) =>
    API.get("/proposals/student", { studentId });

export const submitProposal = (data) =>
    API.post("/proposals", data);

export const createProposal = (proposalData) =>
    API.post("/proposals", proposalData);

export const getProposalRequests = (studentId) =>
    axios.get(`http://localhost:5000/api/proposals/student/${studentId}`);

export const getBatches = () => API.get("/batches");

// ASSESSORS
export const getAssessors = () => API.get("/assessors");
export const uploadAssessors = (data) => API.post("/assessors/upload", data);

// USERS
export const getUsers = () =>
    API.get("/users");

// STATS
export const getStats = () =>
    API.get("/stats");

// CREATE USER
export const createUser = (userData) =>
    API.post("/users", userData);

// BATCHES
export const createBatch = (batchData) => API.post("/batches", batchData);
export const updateBatchStage = (batchId, stage) => API.put(`/batches/${batchId}/stage`, { stage });
export const updateBatch = (batchId, batchData) => API.put(`/batches/${batchId}`, batchData);
export const deleteBatch = (batchId) => API.delete(`/batches/${batchId}`);
export const addStudentToBatch = (batchId, data) => API.post(`/batches/${batchId}/students`, data);
// TEMPLATES
export const getTemplates = () => API.get("/templates");
export const uploadTemplate = (formData) => API.post("/templates/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
});
export const deleteTemplate = (id) => API.delete(`/templates/${id}`);
export const updateTemplate = (id, data) => API.patch(`/templates/${id}`, data);
export const downloadTemplate = (id) => API.get(`/templates/download/${id}`, { responseType: "blob" });
export const viewTemplate = (id) => `http://localhost:5000/api/templates/view/${id}`;

// LOGIN USER
export const getLoggedInUser = () => {
    return JSON.parse(localStorage.getItem("fyp_current_user"));
};

// LOGSHEETS
export const getStudentLogsheets = (studentId) => API.get(`/logsheets/student/${studentId}`);
export const submitLogsheet = (formData) => API.post("/logsheets", formData, {
    headers: { "Content-Type": "multipart/form-data" }
});
export const updateLogsheet = (id, formData) => API.put(`/logsheets/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
});
export const deleteLogsheet = (id) => API.delete(`/logsheets/${id}`);

// SUPERVISOR LOGSHEETS
export const getSupervisorLogsheets = (params) => API.get("/logsheets/supervisor/logsheets", { params });
export const getSupervisorStudents = (params) => API.get("/logsheets/supervisor/students", { params });
export const approveLogsheet = (id, data) => API.post(`/logsheets/supervisor/approve/${id}`, data);
export const rejectLogsheet = (id, data) => API.post(`/logsheets/supervisor/reject/${id}`, data);
export const uploadSignature = (formData) => API.post("/logsheets/supervisor/signature", formData, {
    headers: { "Content-Type": "multipart/form-data" }
});

// ===============================
// EXTERNAL SUPERVISOR
// ===============================


export const registerExternalSupervisor = (data) =>
    API.post("/external-supervisors/register", data);



export const getExternalSupervisorRequests = () =>
    API.get("/admin/pending");



export const approveExternalSupervisor = (id) =>
    API.put(`/admin/external-supervisor-requests/${id}/approve`);



export const rejectExternalSupervisor = (id, data) =>
    API.put(
        `/admin/external-supervisor-requests/${id}/reject`,
        data
    );