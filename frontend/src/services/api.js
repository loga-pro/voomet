import axios from 'axios';

// export const API_BASE_URL = 'http://localhost:5000/api'; // Changed to local for testing
export const API_BASE_URL = 'https://voomet.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for large files
  headers: {
    'Content-Type': 'application/json',
  },
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
      sessionStorage.removeItem('rememberedEmail');
      sessionStorage.removeItem('rememberMe');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
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
  getHistory: (id) => api.get(`/projects/${id}/history`),
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
  updateVendorName: (oldVendorName, newVendorName) => 
    api.patch('/quality/update-vendor-name', { oldVendorName, newVendorName }),
};

//inventory API
export const inventoryAPI = {
  getAll: (filters) => api.get('/inventory', { params: filters }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: async (data) => {
    try {
      const response = await api.post('/inventory', data);
      return response;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      console.error('Error response:', error.response?.data);
      console.error('Request data:', data);
      throw error;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/inventory/${id}`, data);
      return response;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      console.error('Error response:', error.response?.data);
      console.error('Request data:', data);
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

//inhouse milestone API
export const inhouseMilestonesAPI = {
  getAll: (params = {}) => api.get('/inhouse-milestones', { params }),
  getById: (id) => api.get(`/inhouse-milestones/${id}`),
  create: (data) => api.post('/inhouse-milestones', data),
  update: (id, data) => api.put(`/inhouse-milestones/${id}`, data),
  updateTracking: (id, tasks) => api.patch(`/inhouse-milestones/${id}/tracking`, { tasks }),
  delete: (id) => api.delete(`/inhouse-milestones/${id}`),
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
   sendEmail: (boqId, pdfBuffer, customerEmail = 'info@voomet.com') => {
    // Convert Uint8Array to base64 for JSON transmission
    // Use a more efficient approach for large arrays to avoid stack overflow
    let binaryString = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    
    for (let i = 0; i < pdfBuffer.length; i += chunkSize) {
      const chunk = pdfBuffer.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, chunk);
    }
    
    const base64PDF = btoa(binaryString);
    return api.post('/reports/send-email', {
      email: customerEmail,
      reportType: 'boq',
      reportTitle: `BOQ Report - ${boqId}`,
      reportData: [{ boqId: boqId }], // Minimal report data
      pdfData: base64PDF,
      pdfFilename: `BOQ_${boqId}.pdf`,
      boqId: boqId
    }, {
      timeout: 120000, // 2 minute timeout for email with large attachments
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
  },
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
  getProjectsByStage: (stage) => api.get(`/dashboard/projects-by-stage/${stage}`),
};

// vendor API
export const vendorPaymentsAPI = {
  getAll: (filters) => api.get('/vendor-payments', { params: filters }).then(res => res.data.data || res.data),
  getById: (id) => api.get(`/vendor-payments/${id}`),
  create: (data) => {
    return api.post('/vendor-payments', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  update: (id, data) => {
    return api.put(`/vendor-payments/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  delete: (id) => api.delete(`/vendor-payments/${id}`),
  updateVendorName: (oldVendorName, newVendorName) =>
    api.patch('/vendor-payments/update-vendor-name', { oldVendorName, newVendorName }),
};

// Reports API
export const reportsAPI = {
  sendEmail: (data) => api.post('/reports/send-email', data, {
    timeout: 120000, // 2 minute timeout for email with large attachments
    headers: {
      "Content-Type": "multipart/form-data",
    }
  }),
  generatePDF: (data) => api.post('/reports/generate-pdf', data, {
    timeout: 120000, // 2 minute timeout for PDF generation
    responseType: 'blob', // Important for binary data
    headers: {
      'Content-Type': 'application/json',
    }
  }),
  exportCSV: (reportType) => api.get(`/reports/export-csv/${reportType}`, { responseType: 'blob' }),
  getComprehensiveProjects: () => api.get('/reports/project-comprehensive'),
};
// Project Budgets API
export const projectBudgetsAPI = {
  getAll: (filters) => api.get('/project-budgets', { params: filters }),
  getById: (id) => api.get(`/project-budgets/${id}`),
  create: (data) => api.post('/project-budgets', data),
  update: (id, data) => api.put(`/project-budgets/${id}`, data),
  updateProjectExpenditures: (id, projectExpenditures) => api.patch(`/project-budgets/${id}/project-expenditures`, { projectExpenditures }),
  updateLogisticExpenditures: (id, logisticExpenditures) => api.patch(`/project-budgets/${id}/logistic-expenditures`, { logisticExpenditures }),
  delete: (id) => api.delete(`/project-budgets/${id}`),
  exportCSV: () => api.get('/project-budgets/export/csv', { responseType: 'blob' }),
  getFinancialYears: () => api.get('/project-budgets/financial-years'),
};

// Project Expenditures API
export const projectExpendituresAPI = {
  getAll: (params = {}) => api.get('/project-expenditures', { params }),
  getById: (id) => api.get(`/project-expenditures/${id}`),
  getByProject: (projectId) => api.get(`/project-expenditures/project/${projectId}`),
  getByCustomer: (customerId) => api.get(`/project-expenditures/customer/${customerId}`),
  create: (data) => api.post('/project-expenditures', data),
  update: (id, data) => api.put(`/project-expenditures/${id}`, data),
  delete: (id) => api.delete(`/project-expenditures/${id}`),
  updateStatus: (id, status) => api.put(`/project-expenditures/${id}/status`, { status }),
  getSummary: (params = {}) => api.get('/project-expenditures/reports/summary', { params }),
  getStatusReport: (params = {}) => api.get('/project-expenditures/reports/status-wise', { params })
};

// Logistic Expenditures API
export const logisticExpendituresAPI = {
  getAll: (params = {}) => api.get('/logistic-expenditures', { params }),
  create: (data) => api.post('/logistic-expenditures', data),
  update: (id, data) => api.put(`/logistic-expenditures/${id}`, data),
  delete: (id) => api.delete(`/logistic-expenditures/${id}`)
};

// Add to your existing API exports
export const productionAPI = {
  getAll: (filters) => api.get('/production', { params: filters }),
  getById: (id) => api.get(`/production/${id}`),
  create: (data) => api.post('/production', data),
  update: (id, data) => api.put(`/production/${id}`, data),
  delete: (id) => api.delete(`/production/${id}`),
  getSummary: () => api.get('/production/summary'),
  exportCSV: () => api.get('/production/export/csv', { responseType: 'blob' }),
  getUniqueFilters: () => api.get('/production/filters/unique-values'),
  getProjectsByCustomer: (customerName) => api.get(`/production/customer/${customerName}/projects`),
  getByStatus: (status) => api.get(`/production/status/${status}`),
};

// Receipts API
export const receiptsAPI = {
  getAll: (filters) => api.get('/inventory/receipts/all', { params: filters }),
  create: (data) => api.post('/inventory/receipts', data),
  update: (id, data) => api.put(`/inventory/receipts/${id}`, data),
  delete: (id) => api.delete(`/inventory/receipts/${id}`),
};

// Dispatches API
export const dispatchesAPI = {
  getAll: (filters) => api.get('/inventory/dispatches/all', { params: filters }),
  create: (data) => api.post('/inventory/dispatches', data),
  update: (id, data) => api.put(`/inventory/dispatches/${id}`, data),
  delete: (id) => api.delete(`/inventory/dispatches/${id}`),
};

// Purchase Requests API
export const purchaseRequestsAPI = {
  getAll: (filters) => api.get('/purchase-requests', { params: filters }).then(res => res.data.data || res.data),
  getById: (id) => api.get(`/purchase-requests/${id}`),
  getCustomers: () => api.get('/purchase-requests/customers'),
  getProjects: (customerName) => api.get('/purchase-requests/projects', { params: { customerName } }),
  create: (data) => api.post('/purchase-requests', data),
  update: (id, data) => api.put(`/purchase-requests/${id}`, data),
  updateStatus: (id, status) => api.patch(`/purchase-requests/${id}/status`, { status }),
  delete: (id) => api.delete(`/purchase-requests/${id}`),
  getSummaryReport: (params) => api.get('/purchase-requests/reports/summary', { params }),
  exportCSV: (filters) => api.post('/purchase-requests/export/csv', { filters }),
};

// Miscellaneous Expenditures API
export const miscellaneousExpendituresAPI = {
  getAll: (filters) => api.get('/miscellaneous-expenditures', { params: filters }),
  getById: (id) => api.get(`/miscellaneous-expenditures/${id}`),
  create: (data) => {
    const formData = new FormData();
    
    // Append all fields
    Object.keys(data).forEach(key => {
      if (key === 'expenses') {
        formData.append(key, JSON.stringify(data[key]));
      } else if (key === 'receipts') {
        data[key].forEach((file, index) => {
          formData.append('receipts', file);
        });
      } else {
        formData.append(key, data[key]);
      }
    });
    
    return api.post('/miscellaneous-expenditures', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  update: (id, data) => {
    const formData = new FormData();
    
    // Append all fields
    Object.keys(data).forEach(key => {
      if (key === 'expenses') {
        formData.append(key, JSON.stringify(data[key]));
      } else if (key === 'receipts') {
        data[key].forEach((file, index) => {
          formData.append('receipts', file);
        });
      } else {
        formData.append(key, data[key]);
      }
    });
    
    return api.put(`/miscellaneous-expenditures/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  delete: (id) => api.delete(`/miscellaneous-expenditures/${id}`),
  getFinancialYears: () => api.get('/miscellaneous-expenditures/financial-years'),
  exportCSV: (filters) => api.post('/miscellaneous-expenditures/export/csv', { filters }, {
    responseType: 'blob'
  })
};

export default api;
