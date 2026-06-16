import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api",
});

// GET DATA
export const getSupervisors = () => API.get("/supervisors");
export const getStudents = () => API.get("/students");
export const getProposalRequests = () => API.get("/proposals");

// MOCK (keep login local for now)
export const getLoggedInUser = () => {
    return JSON.parse(localStorage.getItem("fyp_current_user"));
};