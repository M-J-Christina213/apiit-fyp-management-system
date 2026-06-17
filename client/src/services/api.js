import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
});

// GET DATA
export const getSupervisors = () => API.get("/supervisors");
export const getStudents = () => API.get("/students");
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
// LOGIN USER
export const getLoggedInUser = () => {
    return JSON.parse(localStorage.getItem("fyp_current_user"));
};