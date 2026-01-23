import React, { useState, useEffect, useMemo } from 'react';
import FloatingInput from './FloatingInput';
import { customersAPI, projectsAPI, transportersAPI, projectBudgetsAPI, partsAPI } from '../../services/api';

const LogisticExpenditureForm = ({
  initialData = [],
  onSave,
  onCancel,
  showNotification,
  showError,
  financialYear,
  customerName,
  projectName
}) => {
  const [expenditures, setExpenditures] = useState(
    initialData.length > 0
      ? initialData
      : [{
        purpose: '',
        vehicleType: '',
        transporterName: '',
        from: '',
        to: '',
        kmTravelled: '',
        ratePerKm: '',
        totalPrice: ''
      }]
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Master data states
  const [financialYears, setFinancialYears] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);

  // Selected masters
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(financialYear || '');
  const [selectedCustomer, setSelectedCustomer] = useState(customerName || '');
  const [selectedProject, setSelectedProject] = useState(projectName || '');

  // Number of rows before scrolling starts
  const MAX_VISIBLE_ROWS = 4;

  // Validation patterns
  const validationPatterns = {
    purpose: {
      pattern: /^.{1,30}$/,
      message: 'Purpose must be 1-30 characters'
    },
    vehicleType: {
      pattern: /^.{1,20}$/,
      message: 'Vehicle type must be 1-20 characters'
    },
    transporterName: {
      pattern: /^.{1,50}$/,
      message: 'Transporter name must be 1-50 characters'
    },
    from: {
      pattern: /^.{0,30}$/,
      message: 'From location must be max 30 characters'
    },
    to: {
      pattern: /^.{0,30}$/,
      message: 'To location must be max 30 characters'
    },
    kmTravelled: {
      pattern: /^\d{1,8}(\.\d{1,2})?$/,
      message: 'KM must be 1-8 digits with optional 2 decimal places'
    },
    ratePerKm: {
      pattern: /^\d{1,8}(\.\d{1,2})?$/,
      message: 'Rate must be 1-8 digits with optional 2 decimal places'
    },
    totalPrice: {
      pattern: /^\d{1,8}(\.\d{1,2})?$/,
      message: 'Amount must be 1-8 digits with optional 2 decimal places'
    }
  };

  // Validation functions
  const validateField = (field, value) => {
    if (!value && field !== 'from' && field !== 'to') {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }

    if (validationPatterns[field]) {
      const { pattern, message } = validationPatterns[field];
      if (value && !pattern.test(value)) {
        return message;
      }
    }

    // Additional specific validations
    if (field === 'kmTravelled' && value) {
      const km = parseFloat(value);
      if (km <= 0) {
        return 'KM must be greater than 0';
      }
      if (km > 99999999.99) {
        return 'KM cannot exceed 99,999,999.99';
      }
    }

    if (field === 'ratePerKm' && value) {
      const rate = parseFloat(value);
      if (rate <= 0) {
        return 'Rate must be greater than 0';
      }
      if (rate > 99999999.99) {
        return 'Rate cannot exceed ₹99,999,999.99';
      }
    }

    if (field === 'totalPrice' && value) {
      const price = parseFloat(value);
      if (price <= 0) {
        return 'Amount must be greater than 0';
      }
      if (price > 99999999.99) {
        return 'Amount cannot exceed ₹99,999,999.99';
      }
    }

    return '';
  };

  // Fetch master data on component mount
  useEffect(() => {
    fetchFinancialYears();
  }, []);

  // Fetch project budgets when financial year changes
  useEffect(() => {
    if (selectedFinancialYear) {
      fetchProjectBudgets(selectedFinancialYear);
    } else {
      setProjectBudgets([]);
      setCustomers([]);
      setProjects([]);
    }
  }, [selectedFinancialYear]);

  // Fetch projects when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchProjects(selectedCustomer);
    } else {
      setProjects([]);
      setParts([]);
    }
  }, [selectedCustomer]);

  // Fetch parts when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchParts(selectedProject);
    } else {
      setParts([]);
    }
  }, [selectedProject]);

  // Fetch financial years
  const fetchFinancialYears = async () => {
    try {
      console.log('Fetching financial years from API...');
      const response = await projectBudgetsAPI.getFinancialYears();
      console.log('Financial years API response:', response);
      const years = response?.data?.financialYears || [];
      console.log('Extracted years:', years);
      const yearOptions = years.map(year => ({ value: year, label: year }));
      console.log('Year options:', yearOptions);
      setFinancialYears(yearOptions);
    } catch (error) {
      console.error('Error fetching financial years:', error);
      showError && showError('Failed to load financial years');
    }
  };

  // Fetch project budgets by financial year
  const fetchProjectBudgets = async (financialYear) => {
    try {
      setLoading(true);
      const response = await projectBudgetsAPI.getAll({ financialYear });
      const budgets = response?.data?.budgets || response?.budgets || [];

      setProjectBudgets(budgets);

      // Extract unique customers from budgets
      const uniqueCustomers = [...new Set(budgets.map(budget => budget.customerName))];
      setCustomers(uniqueCustomers.map(customerName => ({
        value: customerName,
        label: customerName
      })));
    } catch (error) {
      console.error('Error fetching project budgets:', error);
      showError && showError('Failed to load project budgets');
      setProjectBudgets([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers (now derived from project budgets)
  const fetchCustomers = async (financialYear = null) => {
    // This function is now handled by fetchProjectBudgets
    // Keeping it for backward compatibility
    if (financialYear) {
      await fetchProjectBudgets(financialYear);
    }
  };

  // Fetch projects for selected customer (from project budgets)
  const fetchProjects = async (customerName) => {
    try {
      setLoading(true);
      // Filter project budgets by customer name
      const customerBudgets = projectBudgets.filter(budget => budget.customerName === customerName);

      // Extract unique projects for this customer
      const uniqueProjects = [...new Set(customerBudgets.map(budget => budget.projectName))];
      setProjects(uniqueProjects.map(projectName => ({
        value: projectName,
        label: projectName
      })));
    } catch (error) {
      console.error('Error fetching projects:', error);
      showError && showError('Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch parts for selected project from parts API
  const fetchParts = async (projectName) => {
    try {
      setLoading(true);
      // Fetch all parts from parts API
      const response = await partsAPI.getAll();
      const allParts = response.data || [];

      // Set all parts
      setParts(allParts.map(part => ({
        partName: part.partName || '',
        scopeOfWork: part.scopeOfWork || '',
        category: part.category || ''
      })));
    } catch (error) {
      console.error('Error fetching parts:', error);
      showError && showError('Failed to load parts');
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle master selection changes
  const handleFinancialYearChange = (e) => {
    setSelectedFinancialYear(e.target.value);
  };

  const handleCustomerChange = (e) => {
    setSelectedCustomer(e.target.value);
    setSelectedProject('');
    setExpenditures([{
      purpose: '',
      vehicleType: '',
      transporterName: '',
      from: '',
      to: '',
      kmTravelled: '',
      ratePerKm: '',
      totalPrice: ''
    }]);
  };

  const handleProjectChange = (e) => {
    setSelectedProject(e.target.value);
  };

  // Handle expenditure changes with validation
  const handleExpenditureChange = (index, field, value) => {
    // Clear error for this field
    const errorKey = `expenditures.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [errorKey]: true
    }));

    // For KM field, restrict to 8 digits and 2 decimals
    if (field === 'kmTravelled') {
      // Allow only numbers and decimal point
      const cleanedValue = value.replace(/[^0-9.]/g, '');

      // Ensure only one decimal point
      const parts = cleanedValue.split('.');
      if (parts.length > 2) {
        return; // Don't update if multiple decimal points
      }

      // Restrict to 8 digits before decimal and 2 after
      if (parts[0].length > 8) {
        return; // Don't update if more than 8 digits before decimal
      }

      if (parts[1] && parts[1].length > 2) {
        return; // Don't update if more than 2 digits after decimal
      }

      value = cleanedValue;
    }

    // For ratePerKm field, similar restrictions
    if (field === 'ratePerKm') {
      const cleanedValue = value.replace(/[^0-9.]/g, '');
      const parts = cleanedValue.split('.');

      if (parts.length > 2) return;
      if (parts[0].length > 8) return;
      if (parts[1] && parts[1].length > 2) return;

      value = cleanedValue;
    }

    // For totalPrice field, similar restrictions
    if (field === 'totalPrice') {
      const cleanedValue = value.replace(/[^0-9.]/g, '');
      const parts = cleanedValue.split('.');

      if (parts.length > 2) return;
      if (parts[0].length > 8) return;
      if (parts[1] && parts[1].length > 2) return;

      value = cleanedValue;
    }

    // For text fields, restrict length
    if (['purpose', 'from', 'to'].includes(field) && value.length > 30) {
      return;
    }
    if (field === 'vehicleType' && value.length > 20) {
      return;
    }
    if (field === 'transporterName' && value.length > 50) {
      return;
    }

    setExpenditures(prev => {
      const newExpenditures = [...prev];
      newExpenditures[index] = {
        ...newExpenditures[index],
        [field]: value
      };

      // Auto-calculate totalPrice when KM or ratePerKm changes
      if ((field === 'kmTravelled' || field === 'ratePerKm') && value) {
        const km = parseFloat(newExpenditures[index].kmTravelled) || 0;
        const rate = parseFloat(newExpenditures[index].ratePerKm) || 0;
        if (km > 0 && rate > 0) {
          newExpenditures[index].totalPrice = (km * rate).toFixed(2);
        }
      }

      return newExpenditures;
    });
  };



  // Handle blur event for validation
  const handleBlur = (index, field, value) => {
    const errorKey = `expenditures.${index}.${field}`;
    const error = validateField(field, value);

    if (error) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: error
      }));
    }
  };

  // Add new row
  const addRow = () => {
    setExpenditures(prev => [
      ...prev,
      {
        purpose: '',
        vehicleType: '',
        transporterName: '',
        from: '',
        to: '',
        kmTravelled: '',
        ratePerKm: '',
        totalPrice: ''
      }
    ]);
  };

  // Remove row
  const removeRow = (index) => {
    if (expenditures.length > 1) {
      setExpenditures(prev => prev.filter((_, i) => i !== index));

      // Also remove errors for this row
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith(`expenditures.${index}`)) {
            delete newErrors[key];
          }
        });
        return newErrors;
      });
    }
  };

  // Calculate total
  const total = useMemo(() => {
    return expenditures
      .map(e => parseFloat(e.totalPrice) || 0)
      .reduce((s, v) => s + v, 0);
  }, [expenditures]);

  // Validate entire form
  const validateForm = () => {
    const newErrors = {};

    // Validate master fields
    if (!selectedFinancialYear) {
      newErrors.financialYear = 'Financial year is required';
    }
    if (!selectedCustomer) {
      newErrors.customer = 'Customer is required';
    }
    if (!selectedProject) {
      newErrors.project = 'Project is required';
    }

    // Validate expenditures
    expenditures.forEach((exp, index) => {
      const fieldsToValidate = ['purpose', 'vehicleType', 'transporterName', 'kmTravelled', 'ratePerKm', 'totalPrice'];

      fieldsToValidate.forEach(field => {
        const error = validateField(field, exp[field]);
        if (error) {
          newErrors[`expenditures.${index}.${field}`] = error;
        }
      });

      // Validate optional fields if they have value
      if (exp.from) {
        const error = validateField('from', exp.from);
        if (error) newErrors[`expenditures.${index}.from`] = error;
      }

      if (exp.to) {
        const error = validateField('to', exp.to);
        if (error) newErrors[`expenditures.${index}.to`] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm()) {
      showError && showError('Please fix all validation errors');
      return;
    }

    const validExpenditures = expenditures
      .filter(exp => exp.purpose && exp.vehicleType && exp.transporterName && exp.kmTravelled && exp.ratePerKm && exp.totalPrice)
      .map(exp => ({
        purpose: exp.purpose.trim(),
        vehicleType: exp.vehicleType.trim(),
        transporterName: exp.transporterName.trim(),
        from: (exp.from || '').trim(),
        to: (exp.to || '').trim(),
        kmTravelled: parseFloat(exp.kmTravelled) || 0,
        ratePerKm: parseFloat(exp.ratePerKm) || 0,
        totalPrice: parseFloat(exp.totalPrice) || 0
      }));

    if (validExpenditures.length === 0) {
      showError && showError('Please add at least one valid expenditure');
      return;
    }

    onSave({
      financialYear: selectedFinancialYear,
      customerName: customers.find(c => c.value === selectedCustomer)?.label || selectedCustomer,
      projectName: projects.find(p => p.value === selectedProject)?.label || selectedProject,
      expenditures: validExpenditures,
      total: total
    });
  };

  // Inline styles for the scrollable table
  const tableContainerStyle = {
    maxHeight: expenditures.length > MAX_VISIBLE_ROWS ? '400px' : 'auto',
    overflowY: expenditures.length > MAX_VISIBLE_ROWS ? 'auto' : 'visible',
    overflowX: 'auto',
    position: 'relative'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Master Data Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Logistic Expenditure Master Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FloatingInput
            label="Financial Year"
            value={selectedFinancialYear}
            onChange={handleFinancialYearChange}
            error={errors.financialYear}
            type="select"
            required={true}
            options={financialYears}
          />

          <FloatingInput
            label="Client Name"
            value={selectedCustomer}
            onChange={handleCustomerChange}
            error={errors.customer}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Customer' },
              ...customers
            ]}
            disabled={loading}
          />

          <FloatingInput
            label="Project"
            value={selectedProject}
            onChange={handleProjectChange}
            error={errors.project}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Project' },
              ...projects
            ]}
            disabled={!selectedCustomer || loading}
          />
        </div>
      </div>

      {/* Expenditures Table */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Logistic Details</h3>
          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            disabled={!selectedProject}
          >
            + Add Row
          </button>
        </div>

        {/* Table container with scroll */}
        <div className="border rounded-md overflow-hidden" style={tableContainerStyle}>
          <table className="min-w-full divide-y divide-gray-300 text-sm">
            {/* Fixed header */}
            <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 min-w-[150px] text-center">Purpose*</th>
                <th className="px-3 py-2 min-w-[120px] text-center">Vehicle Type*</th>
                <th className="px-3 py-2 min-w-[150px] text-center">Transporter*</th>
                <th className="px-3 py-2 min-w-[120px] text-center">From</th>
                <th className="px-3 py-2 min-w-[120px] text-center">To</th>
                <th className="px-3 py-2 min-w-[100px] text-center">KM*</th>
                <th className="px-3 py-2 min-w-[100px] text-center">Rate/KM (₹)*</th>
                <th className="px-3 py-2 min-w-[120px] text-center">Total (₹)*</th>
                <th className="px-3 py-2 min-w-[80px] text-center">Actions</th>
              </tr>
            </thead>

            {/* Scrollable body */}
            <tbody className="divide-y divide-gray-200 bg-white">
              {expenditures.map((exp, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {/* Purpose */}
                  <td className="px-3 py-2 text-center">
                    <input
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.purpose}
                      onChange={(e) => handleExpenditureChange(index, 'purpose', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'purpose', e.target.value)}
                      placeholder="Enter purpose (1-30 chars)"
                      disabled={!selectedProject}
                      maxLength={30}
                    />
                    {errors[`expenditures.${index}.purpose`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.purpose`]}
                      </div>
                    )}
                  </td>

                  {/* Vehicle Type */}
                  <td className="px-3 py-2 text-center">
                    <input
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.vehicleType}
                      onChange={(e) => handleExpenditureChange(index, 'vehicleType', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'vehicleType', e.target.value)}
                      placeholder="e.g., Truck, Trailer"
                      disabled={!selectedProject}
                      maxLength={20}
                    />
                    {errors[`expenditures.${index}.vehicleType`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.vehicleType`]}
                      </div>
                    )}
                  </td>

                  {/* Transporter */}
                  <td className="px-3 py-2 text-center">
                    <input
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.transporterName}
                      onChange={(e) => handleExpenditureChange(index, 'transporterName', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'transporterName', e.target.value)}
                      placeholder="Transporter name"
                      disabled={!selectedProject}
                      maxLength={50}
                    />
                    {errors[`expenditures.${index}.transporterName`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.transporterName`]}
                      </div>
                    )}
                  </td>

                  {/* From */}
                  <td className="px-3 py-2 text-center">
                    <input
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.from}
                      onChange={(e) => handleExpenditureChange(index, 'from', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'from', e.target.value)}
                      placeholder="Starting location"
                      disabled={!selectedProject}
                      maxLength={30}
                    />
                    {errors[`expenditures.${index}.from`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.from`]}
                      </div>
                    )}
                  </td>

                  {/* To */}
                  <td className="px-3 py-2 text-center">
                    <input
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.to}
                      onChange={(e) => handleExpenditureChange(index, 'to', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'to', e.target.value)}
                      placeholder="Destination"
                      disabled={!selectedProject}
                      maxLength={30}
                    />
                    {errors[`expenditures.${index}.to`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.to`]}
                      </div>
                    )}
                  </td>

                  {/* KM Travelled */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.kmTravelled}
                      onChange={(e) => handleExpenditureChange(index, 'kmTravelled', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'kmTravelled', e.target.value)}
                      placeholder="0.00"
                      disabled={!selectedProject}
                      inputMode="decimal"
                    />
                    {errors[`expenditures.${index}.kmTravelled`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.kmTravelled`]}
                      </div>
                    )}
                  </td>

                  {/* Rate Per KM */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.ratePerKm}
                      onChange={(e) => handleExpenditureChange(index, 'ratePerKm', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'ratePerKm', e.target.value)}
                      placeholder="0.00"
                      disabled={!selectedProject}
                      inputMode="decimal"
                    />
                    {errors[`expenditures.${index}.ratePerKm`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.ratePerKm`]}
                      </div>
                    )}
                  </td>

                  {/* Total Price */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border rounded bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={exp.totalPrice}
                      onChange={(e) => handleExpenditureChange(index, 'totalPrice', e.target.value)}
                      onBlur={(e) => handleBlur(index, 'totalPrice', e.target.value)}
                      placeholder="0.00"
                      disabled={!selectedProject}
                      inputMode="decimal"
                    />
                    {errors[`expenditures.${index}.totalPrice`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.totalPrice`]}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-center">
                    {expenditures.length > 1 && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded"
                        onClick={() => removeRow(index)}
                        aria-label="Delete row"
                        disabled={!selectedProject}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show scroll indicator when there are many rows */}
        {expenditures.length > MAX_VISIBLE_ROWS && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            Scroll to see more rows ({expenditures.length} total)
          </div>
        )}

        {/* Validation Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 font-medium mb-2">Please fix the following errors:</p>
            <ul className="text-red-500 text-sm list-disc pl-5">
              {Object.entries(errors).map(([key, error]) => (
                <li key={key}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Total and Actions */}
      <div className="flex justify-between items-center border-t pt-4">
        <div className="text-xl font-bold">
          Total: ₹{total.toFixed(2)}
        </div>
        <div className="space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={!selectedProject || loading}
          >
            Save Logistic Costs
          </button>
        </div>
      </div>

      {/* Add some CSS for better scroll experience */}
      <style jsx>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollable-table::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollable-table {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        /* Optional: Add smooth scrolling */
        table {
          border-collapse: collapse;
        }
        
        thead th {
          position: sticky;
          top: 0;
          background-color: #f3f4f6; /* bg-gray-100 */
          z-index: 10;
          box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default LogisticExpenditureForm;