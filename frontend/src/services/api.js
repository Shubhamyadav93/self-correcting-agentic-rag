import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const checkBackendHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const sendClinicalQuery = async (question) => {
  const response = await apiClient.post('/api/chat', {
    question: question.trim(),
  });
  return response.data;
};

export const uploadMedicalPdf = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/ingest', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getTriageRecommendations = async ({ query, answer, citations }) => {
  const response = await apiClient.post('/api/triage/recommend', {
    query: (query || '').trim(),
    answer: answer || '',
    citations: citations || [],
  });
  return response.data;
};

export const getDoctors = async (specialty) => {
  const params = specialty ? { specialty } : {};
  const response = await apiClient.get('/api/doctors', { params });
  return response.data;
};

export const getDoctorSlots = async (doctorId, date) => {
  const response = await apiClient.get(`/api/doctors/${doctorId}/slots`, {
    params: { date },
  });
  return response.data;
};

export const bookAppointment = async (appointmentData) => {
  const response = await apiClient.post('/api/appointments', appointmentData);
  return response.data;
};

export const getAppointments = async (filter) => {
  let params = {};
  if (typeof filter === 'number') {
    params.doctor_id = filter;
  } else if (filter && typeof filter === 'object') {
    if (filter.doctor_id) params.doctor_id = filter.doctor_id;
    if (filter.patient_email) params.patient_email = filter.patient_email;
  }
  const response = await apiClient.get('/api/appointments', { params });
  return response.data;
};

export const registerDoctor = async (doctorData) => {
  const response = await apiClient.post('/api/doctors/register', doctorData);
  return response.data;
};

export const savePrescription = async (bookingCode, { doctor_notes, status = 'COMPLETED' }) => {
  const response = await apiClient.patch(`/api/appointments/${bookingCode}/prescription`, {
    doctor_notes,
    status,
  });
  return response.data;
};

export const loginUser = async ({ email, password, role }) => {
  const response = await apiClient.post('/api/auth/login', {
    email: email.trim(),
    password,
    role,
  });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await apiClient.post('/api/auth/register', userData);
  return response.data;
};

export const updateDoctorProfile = async (doctorId, profileData) => {
  const response = await apiClient.patch(`/api/doctors/${doctorId}/profile`, profileData);
  return response.data;
};

export default apiClient;
