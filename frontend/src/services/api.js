import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.15:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verify: () => api.get('/auth/verify'),
  getAllUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// Employees API
export const employeesAPI = {
  getAll: (filters) => api.get('/employees', { params: filters }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Parts API
export const partsAPI = {
  getAll: (filters) => api.get('/parts', { params: filters }),
  getById: (id) => api.get(`/parts/${id}`),
  create: (data) => api.post('/parts', data),
  update: (id, data) => api.put(`/parts/${id}`, data),
  delete: (id) => api.delete(`/parts/${id}`),
};

// Projects API
export const projectsAPI = {
  getAll: (filters) => api.get('/projects', { params: filters }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Customers API
export const customersAPI = {
  getAll: (filters) => api.get('/customers', { params: filters }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Vendors API
export const vendorsAPI = {
  getAll: (filters) => api.get('/vendors', { params: filters }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
};

// quantity API
export const qualityAPI = {
  getAll: (filters) => api.get('/quality', { params: filters }),
  getById: (id) => api.get(`/quality/${id}`),
  create: (data) => api.post('/quality', data),
  update: (id, data) => api.put(`/quality/${id}`, data),
  delete: (id) => api.delete(`/quality/${id}`),
};

//inventory API
export const inventoryAPI = {
  getAll: (filters) => api.get('/inventory', { params: filters }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => {
    try {
      return api.post('/inventory', data);
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  },
  update: (id, data) => {
    try {
      return api.put(`/inventory/${id}`, data);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },
  delete: (id) => api.delete(`/inventory/${id}`),
};

//milestone API
export const milestonesAPI = {
  getAll: (params = {}) => api.get('/milestones', { params }),
  getById: (id) => api.get(`/milestones/${id}`),
  create: (data) => api.post('/milestones', data),
  update: (id, data) => api.put(`/milestones/${id}`, data),
  updateTracking: (id, tasks) => api.patch(`/milestones/${id}/tracking`, { tasks }),
  delete: (id) => api.delete(`/milestones/${id}`),
};


//boq API
export const boqAPI = {
  getAll: (filters) => api.get('/boq', { params: filters }),
  getById: (id) => api.get(`/boq/${id}`),
  create: (data) => {
    return api.post('/boq', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  update: (id, data) => {
    return api.put(`/boq/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  delete: (id) => api.delete(`/boq/${id}`),
};

// Payments API
export const paymentsAPI = {
  getAll: (filters) => api.get('/payments', { params: filters }).then(res => res.data.data || res.data),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  addInvoice: (id, data) => api.post(`/payments/${id}/invoices`, data),
  addPayment: (id, invoiceIndex, data) => api.post(`/payments/${id}/invoices/${invoiceIndex}/payments`, data),
  getAwardedCustomers: () => api.get('/payments/customers/awarded'),
  getProjectsByCustomer: (customer) => api.get(`/payments/projects/by-customer/${customer}`),
};

// Dashboard API
export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard/kpis'),
};
// vendor API
export const vendorPaymentsAPI = {
  getAll: (filters) => api.get('/vendor-payments', { params: filters }).then(res => res.data.data || res.data),
  getById: (id) => api.get(`/vendor-payments/${id}`),
  create: (data) => api.post('/vendor-payments', data),
  update: (id, data) => api.put(`/vendor-payments/${id}`, data),
  delete: (id) => api.delete(`/vendor-payments/${id}`),
};

// Reports API
export const reportsAPI = {
  sendEmail: (data) => api.post('/reports/send-email', data),
  exportCSV: (reportType) => api.get(`/reports/export-csv/${reportType}`, { responseType: 'blob' }),
};

export default api;