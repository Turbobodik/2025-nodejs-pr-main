import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const studentAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.group) params.append('group', filters.group);
    if (filters.minAge) params.append('minAge', filters.minAge);
    if (filters.maxAge) params.append('maxAge', filters.maxAge);
    
    const response = await api.get(`/students?${params.toString()}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  getByGroup: async (group) => {
    const response = await api.get(`/students/group/${group}`);
    return response.data;
  },

  create: async (studentData) => {
    const response = await api.post('/students', studentData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  },

  getAverageAge: async () => {
    const response = await api.get('/students/average-age');
    return response.data;
  },

  update: async (id, studentData) => {
    const response = await api.put(`/students/${id}`, studentData);
    return response.data;
  },

  replaceAll: async (students) => {
    const response = await api.put('/students', { students });
    return response.data;
  },

  save: async () => {
    const response = await api.get('/students/save');
    return response.data;
  },

  load: async () => {
    const response = await api.get('/students/load');
    return response.data;
  },
};

export const backupAPI = {
  start: async (interval = 30) => {
    const response = await api.post('/backup/start', { interval });
    return response.data;
  },

  stop: async () => {
    const response = await api.post('/backup/stop');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/backup/status');
    return response.data;
  },

  getReport: async () => {
    const response = await api.get('/backup/report');
    return response.data;
  },
};

export default api;

