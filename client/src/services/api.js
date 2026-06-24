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
export const getStudents = (params = {}) => API.get("/students", { params });
export const getProposalRequests = () => API.get("/proposals");
export const createProposal = (proposalData) =>
    API.post("/proposals", proposalData);
export const getBatches = () => API.get("/batches");
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
// LOGIN USER
export const getLoggedInUser = () => {
    return JSON.parse(localStorage.getItem("fyp_current_user"));
};