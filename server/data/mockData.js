// Persistent mock data store using localStorage
const STORAGE_KEYS = {
  STUDENTS: 'fyp_students',
  SUPERVISORS: 'fyp_supervisors',
  PROPOSAL_REQUESTS: 'fyp_proposal_requests',
  USERS: 'fyp_users',
  BATCHES: 'fyp_batches',
  LOGGED_IN_USER: 'fyp_current_user'
};

const defaultStudents = [
  { id: 'CB001', name: 'John Doe', batch: '2024-Feb', status: 'Proposal Pending', email: 'cb001@students.apiit.lk', topic: 'AI in Healthcare', supervisor: 'Dr. Alan Smith' },
  { id: 'CB002', name: 'Jane Roe', batch: '2024-Feb', status: 'Assigned', email: 'cb002@students.apiit.lk', topic: 'Blockchain Voting', supervisor: 'Prof. Sarah Davis' },
  { id: 'CB003', name: 'Sam Smith', batch: '2024-Sep', status: 'Unassigned', email: 'cb003@students.apiit.lk', topic: 'IoT Smart Homes', supervisor: null },
  { id: 'CB004', name: 'Alice Lee', batch: '2024-Sep', status: 'Proposal Approved', email: 'cb004@students.apiit.lk', topic: 'ML for Stock Prediction', supervisor: 'Dr. Alan Smith' },
  { id: 'CB005', name: 'David Beckham', batch: '2024-Feb', status: 'Unassigned', email: 'cb005@students.apiit.lk', topic: 'Augmented Reality in Education', supervisor: null },
  { id: 'CB006', name: 'Emily Watson', batch: '2024-Sep', status: 'Proposal Pending', email: 'cb006@students.apiit.lk', topic: 'Predictive analytics in retail', supervisor: null },
  { id: 'CB007', name: 'Fiona Gallagher', batch: '2023-Sep', status: 'Assigned', email: 'cb007@students.apiit.lk', topic: 'Distributed Ledger Databases', supervisor: 'Mr. Robert Johnson' },
];

const defaultSupervisors = [
  { id: 'S001', title: 'Dr.', name: 'Alan Smith', email: 'asmith@apiit.lk', expertise: 'Artificial Intelligence, Machine Learning', interests: 'Deep Learning, NLP', slots: 2, status: 'Available' },
  { id: 'S002', title: 'Prof.', name: 'Sarah Davis', email: 'sdavis@apiit.lk', expertise: 'Cybersecurity, Blockchain', interests: 'Cryptography, Smart Contracts', slots: 0, status: 'Full' },
  { id: 'S003', title: 'Mr.', name: 'Robert Johnson', email: 'rjohnson@apiit.lk', expertise: 'Software Engineering, Web Tech', interests: 'Microservices, Cloud Computing', slots: 5, status: 'Available' },
];

const defaultProposalRequests = [
  { id: 'PR001', studentName: 'John Doe', studentNumber: 'CB001', topic: 'AI in Healthcare', date: '2026-06-10', status: 'Pending' },
  { id: 'PR002', studentName: 'Alice Lee', studentNumber: 'CB004', topic: 'ML for Stock Prediction', date: '2026-06-08', status: 'Approved' },
  { id: 'PR003', studentName: 'Emily Watson', studentNumber: 'CB006', topic: 'Predictive analytics in retail', date: '2026-06-12', status: 'Pending' },
];

const defaultUsers = [
  { id: 'U001', name: 'John Doe', role: 'Student', email: 'student@apiit.lk', status: 'Active' },
  { id: 'U002', name: 'Dr. Alan Smith', role: 'Supervisor', email: 'supervisor@apiit.lk', status: 'Active' },
  { id: 'U003', name: 'Admin User', role: 'Admin', email: 'admin@apiit.lk', status: 'Active' },
  { id: 'U004', name: 'PM Manager', role: 'Project Manager', email: 'pm@apiit.lk', status: 'Active' },
];

const defaultBatches = [
  { id: 'B001', name: '2023-Feb', startDate: '2023-02-15', studentCount: 124, status: 'Completed' },
  { id: 'B002', name: '2023-Sep', startDate: '2023-09-20', studentCount: 145, status: 'Ongoing' },
  { id: 'B003', name: '2024-Feb', startDate: '2024-02-18', studentCount: 156, status: 'Ongoing' },
  { id: 'B004', name: '2024-Sep', startDate: '2024-09-15', studentCount: 110, status: 'Upcoming' },
];

// Load item helpers
const loadItem = (key, defaultValue) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(data);
};

const saveItem = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// State initializers
export const initializeState = () => {
  loadItem(STORAGE_KEYS.STUDENTS, defaultStudents);
  loadItem(STORAGE_KEYS.SUPERVISORS, defaultSupervisors);
  loadItem(STORAGE_KEYS.PROPOSAL_REQUESTS, defaultProposalRequests);
  loadItem(STORAGE_KEYS.USERS, defaultUsers);
  loadItem(STORAGE_KEYS.BATCHES, defaultBatches);
};

// API style local getter and setters
export const getStudents = () => loadItem(STORAGE_KEYS.STUDENTS, defaultStudents);
export const saveStudents = (data) => saveItem(STORAGE_KEYS.STUDENTS, data);

export const getSupervisors = () => loadItem(STORAGE_KEYS.SUPERVISORS, defaultSupervisors);
export const saveSupervisors = (data) => saveItem(STORAGE_KEYS.SUPERVISORS, data);

export const getProposalRequests = () => loadItem(STORAGE_KEYS.PROPOSAL_REQUESTS, defaultProposalRequests);
export const saveProposalRequests = (data) => saveItem(STORAGE_KEYS.PROPOSAL_REQUESTS, data);

export const getUsers = () => loadItem(STORAGE_KEYS.USERS, defaultUsers);
export const saveUsers = (data) => saveItem(STORAGE_KEYS.USERS, data);

export const getBatches = () => loadItem(STORAGE_KEYS.BATCHES, defaultBatches);
export const saveBatches = (data) => saveItem(STORAGE_KEYS.BATCHES, data);

export const getLoggedInUser = () => {
  const user = localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER);
  return user ? JSON.parse(user) : null;
};
export const setLoggedInUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN_USER);
  }
};

export const getStats = () => {
  const students = getStudents();
  const supervisors = getSupervisors();
  const requests = getProposalRequests();
  const users = getUsers();

  return {
    totalStudents: students.length + 420, // Add scale to look realistic
    availableSupervisors: supervisors.filter(s => s.slots > 0).length,
    unassignedStudents: students.filter(s => s.supervisor === null).length,
    pendingProposals: requests.filter(r => r.status === 'Pending').length,
    totalUsers: users.length + 800,
    studentsCount: students.length + 750,
    supervisorsCount: supervisors.length + 40,
    pmsCount: 7
  };
};

// Initialize right away
if (typeof window !== 'undefined') {
  initializeState();
}
