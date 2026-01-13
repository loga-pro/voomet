import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { customersAPI, projectsAPI, projectBudgetsAPI } from '../../services/api';

const MiscellaneousExpenditureForm = ({
  initialData = {},
  financialYear,
  customerName,
  projectName,
  onSave,
  onCancel,
  showNotification,
  showError
}) => {
  const [formData, setFormData] = useState({
    financialYear: initialData.financialYear || financialYear || '',
    customer: (initialData.customer && typeof initialData.customer === 'object')
      ? initialData.customer._id
      : (initialData.customer || ''),
    customerName: initialData.customerName || customerName || '',
    project: (initialData.project && typeof initialData.project === 'object')
      ? initialData.project._id
      : (initialData.project || ''),
    projectName: initialData.projectName || projectName || '',
    expenses: initialData.expenses || [{
      date: new Date().toISOString().split('T')[0],
      expenseCategory: 'Others',
      expenseDescription: '',
      amount: '',
      paymentMethod: 'Cash',
      receipt: null,
      remarks: ''
    }],
    status: initialData.status || 'Draft'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Expense category options
  const expenseCategories = [
    'Labour',
    'Travel',
    'Food',
    'Accommodation',
    'Transport',
    'Office Supplies',
    'Utilities',
    'Maintenance',
    'Others'
  ];

  // Payment method options
  const paymentMethods = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'UPI',
    'Cheque',
    'Others'
  ];

  // Filtered Options State
  const [availableDetails, setAvailableDetails] = useState({
    years: [],
    customers: [],
    projects: []
  });

  useEffect(() => {
    fetchMasterData();
    fetchProjectBudgets();
  }, []);

  // 1. Update available Financial Years based on Project Budgets
  useEffect(() => {
    if (projectBudgets.length > 0) {
      const years = [...new Set(projectBudgets.map(b => b.financialYear))].sort().reverse();
      setAvailableDetails(prev => ({
        ...prev,
        years: years.map(y => ({ value: y, label: y }))
      }));
    }
  }, [projectBudgets]);

  // 2. Update available Customers based on selected Financial Year
  useEffect(() => {
    if (formData.financialYear && projectBudgets.length > 0) {
      const relevantBudgets = projectBudgets.filter(b => b.financialYear === formData.financialYear);
      const customerNames = [...new Set(relevantBudgets.map(b => b.customerName))];

      const filteredCustomers = customers.filter(c =>
        customerNames.some(name => name && c.label && name.trim().toLowerCase() === c.label.trim().toLowerCase())
      );

      setAvailableDetails(prev => ({
        ...prev,
        customers: filteredCustomers
      }));
    } else {
      setAvailableDetails(prev => ({ ...prev, customers: [] }));
    }
  }, [formData.financialYear, projectBudgets, customers]);

  // 3. Update available Projects based on selected Customer and Financial Year
  useEffect(() => {
    // When customer changes, we fetch valid projects from API first to get IDs
    if (formData.customer) {
      fetchProjects(formData.customer);
    }
  }, [formData.customer]);

  // 4. Filter Projects once they are loaded and we have context
  useEffect(() => {
    if (formData.financialYear && formData.customerName && projectBudgets.length > 0) {
      const relevantBudgets = projectBudgets.filter(b =>
        b.financialYear === formData.financialYear &&
        b.customerName?.trim().toLowerCase() === formData.customerName?.trim().toLowerCase()
      );
      const projectNames = [...new Set(relevantBudgets.map(b => b.projectName))];

      const filteredProjects = projects.filter(p =>
        projectNames.some(name => name && p.label && name.trim().toLowerCase() === p.label.trim().toLowerCase())
      );

      setAvailableDetails(prev => ({
        ...prev,
        projects: filteredProjects
      }));
    } else {
      setAvailableDetails(prev => ({ ...prev, projects: [] }));
    }
  }, [formData.financialYear, formData.customerName, projectBudgets, projects]);

  const fetchMasterData = async () => {
    try {
      setLoading(true);

      // Fetch financial years
      const yearsResponse = await projectBudgetsAPI.getFinancialYears();
      setFinancialYears(yearsResponse.data?.financialYears?.map(year => ({ value: year, label: year })) || []);

      // Fetch customers
      const customersResponse = await customersAPI.getAll();
      setCustomers(customersResponse.data?.map(customer => ({
        value: customer._id,
        label: customer.customerName || customer.name
      })) || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
      showError && showError('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectBudgets = async () => {
    try {
      const response = await projectBudgetsAPI.getAll();
      // Ensure we always set an array
      const budgets = Array.isArray(response.data)
        ? response.data
        : (response.data?.budgets || response.data?.data || []);
      setProjectBudgets(budgets);
    } catch (error) {
      console.error('Error fetching project budgets:', error);
      showError && showError('Failed to load project budgets');
      setProjectBudgets([]); // Set empty array on error
    }
  };

  const fetchProjects = async (customerId) => {
    try {
      setLoading(true);
      const response = await projectsAPI.getAll({ customer: customerId });
      setProjects(response.data?.map(project => ({
        value: project._id,
        label: project.projectName || project.name
      })) || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showError && showError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSelection = (budgetId) => {
    const budget = projectBudgets.find(b => b._id === budgetId);
    if (budget) {
      setSelectedBudget(budget);

      // Find customer by name
      const customer = customers.find(c => c.label === budget.customerName);

      setFormData(prev => ({
        ...prev,
        financialYear: budget.financialYear,
        customer: customer?.value || '',
        customerName: budget.customerName,
        project: '', // Will be set after projects are loaded
        projectName: budget.projectName
      }));

      // Fetch projects for this customer and then set the project
      if (customer) {
        fetchProjects(customer.value).then(() => {
          // Find and set the project after projects are loaded
          setTimeout(() => {
            const project = projects.find(p => p.label === budget.projectName);
            if (project) {
              setFormData(prev => ({
                ...prev,
                project: project.value
              }));
            }
          }, 500);
        });
      }
    }
  };

  const handleMasterChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'customer') {
        const customer = customers.find(c => c.value === value);
        newData.customerName = customer?.label || '';
        newData.project = '';
        newData.projectName = '';
      } else if (field === 'project') {
        const project = projects.find(p => p.value === value);
        newData.projectName = project?.label || '';
      }

      return newData;
    });
  };

  const handleExpenseChange = (index, field, value) => {
    setFormData(prev => {
      const newExpenses = [...prev.expenses];
      newExpenses[index] = {
        ...newExpenses[index],
        [field]: value
      };

      // Auto-calculate total if amount changes
      if (field === 'amount') {
        const totalAmount = newExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        return { ...prev, expenses: newExpenses, totalAmount };
      }

      return { ...prev, expenses: newExpenses };
    });
  };

  const handleFileUpload = (index, file) => {
    setFormData(prev => {
      const newExpenses = [...prev.expenses];
      newExpenses[index] = {
        ...newExpenses[index],
        receipt: file,
        receiptName: file.name
      };
      return { ...prev, expenses: newExpenses };
    });
  };

  const viewReceipt = (receipt) => {
    console.log('viewReceipt called with:', receipt);

    if (!receipt) {
      showError && showError('No receipt file available to view');
      return;
    }

    try {
      // If it's a File object (newly uploaded), create a blob URL
      if (receipt instanceof File) {
        console.log('Opening File object:', receipt.name, receipt.type);
        const blobUrl = URL.createObjectURL(receipt);
        const newWindow = window.open(blobUrl, '_blank');

        if (!newWindow) {
          showError && showError('Please allow popups to view the receipt');
        }

        // Clean up the blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        return;
      }

      // If it's a string (URL from server)
      if (typeof receipt === 'string') {
        console.log('Opening string URL:', receipt);
        // Handle different URL formats
        if (receipt.startsWith('http') || receipt.startsWith('data:')) {
          window.open(receipt, '_blank');
        } else if (receipt.startsWith('/')) {
          window.open(`${window.location.origin}${receipt}`, '_blank');
        } else {
          window.open(`${window.location.origin}/${receipt}`, '_blank');
        }
        return;
      }

      // If it's an object with a path or url property
      if (typeof receipt === 'object' && (receipt.path || receipt.url)) {
        console.log('Opening object with path/url:', receipt);
        const url = receipt.path || receipt.url;
        if (url.startsWith('http') || url.startsWith('data:')) {
          window.open(url, '_blank');
        } else if (url.startsWith('/')) {
          window.open(`${window.location.origin}${url}`, '_blank');
        } else {
          window.open(`${window.location.origin}/${url}`, '_blank');
        }
        return;
      }

      // If we get here, we don't know how to handle this receipt type
      console.error('Unknown receipt type:', typeof receipt, receipt);
      showError && showError('Unable to view receipt - unknown file format');

    } catch (error) {
      console.error('Error viewing receipt:', error);
      showError && showError('Failed to open receipt file');
    }
  };

  const addExpenseRow = () => {
    setFormData(prev => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          date: new Date().toISOString().split('T')[0],
          expenseCategory: 'Others',
          expenseDescription: '',
          amount: '',
          paymentMethod: 'Cash',
          receipt: null,
          remarks: ''
        }
      ]
    }));
  };

  const removeExpenseRow = (index) => {
    if (formData.expenses.length > 1) {
      setFormData(prev => ({
        ...prev,
        expenses: prev.expenses.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.financialYear) {
      newErrors.financialYear = 'Financial year is required';
    }
    if (!formData.customer) {
      newErrors.customer = 'Customer is required';
    }
    if (!formData.project) {
      newErrors.project = 'Project is required';
    }

    formData.expenses.forEach((expense, index) => {
      if (!expense.date) {
        newErrors[`expenses.${index}.date`] = 'Date is required';
      }
      if (!expense.expenseCategory) {
        newErrors[`expenses.${index}.expenseCategory`] = 'Category is required';
      }
      if (!expense.expenseDescription) {
        newErrors[`expenses.${index}.expenseDescription`] = 'Description is required';
      }
      if (!expense.amount || parseFloat(expense.amount) <= 0) {
        newErrors[`expenses.${index}.amount`] = 'Valid amount is required';
      }
      if (!expense.paymentMethod) {
        newErrors[`expenses.${index}.paymentMethod`] = 'Payment method is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showError && showError('Please fix all validation errors');
      return;
    }

    try {
      setLoading(true);

      // Prepare form data for submission
      const submitData = {
        ...formData,
        expenses: formData.expenses.map(expense => ({
          ...expense,
          amount: parseFloat(expense.amount)
        })),
        receipts: formData.expenses
          .map(expense => expense.receipt)
          .filter(Boolean)
      };

      await onSave(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
      showError && showError('Failed to save expenditure');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return formData.expenses.reduce((total, expense) =>
      total + (parseFloat(expense.amount) || 0), 0
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">


      {/* Master Data Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Miscellaneous Expenditure Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FloatingInput
            label="Financial Year"
            value={formData.financialYear}
            onChange={(e) => handleMasterChange('financialYear', e.target.value)}
            error={errors.financialYear}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Financial Year' },
              ...availableDetails.years
            ]}
          />

          <FloatingInput
            label="Customer Name"
            value={formData.customer}
            onChange={(e) => handleMasterChange('customer', e.target.value)}
            error={errors.customer}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Customer' },
              ...availableDetails.customers
            ]}
            disabled={loading || !formData.financialYear}
          />

          <FloatingInput
            label="Project Name"
            value={formData.project}
            onChange={(e) => handleMasterChange('project', e.target.value)}
            error={errors.project}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Project' },
              ...availableDetails.projects
            ]}
            disabled={!formData.customer || loading}
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Expense Details
          </h3>
          <button
            type="button"
            onClick={addExpenseRow}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            disabled={!formData.project}
          >
            + Add Expense
          </button>
        </div>

        <div className="border rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-300 text-sm">
              <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="w-[14%] px-3 py-2 text-center">Date</th>
                  <th className="w-[15%] px-3 py-2 text-center">Category</th>
                  <th className="w-[20%] px-3 py-2 text-center">Description</th>
                  <th className="w-[12%] px-3 py-2 text-center">Amount (₹)</th>
                  <th className="w-[16%] px-3 py-2 text-center">Payment Method</th>
                  <th className="w-[17%] px-3 py-2 text-center">Receipt</th>
                  <th className="w-[6%] px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
            </table>
          </div>

          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '280px' }}>
            <table className="min-w-full table-fixed divide-y divide-gray-300 text-sm">
              <tbody className="divide-y divide-gray-200">
                {formData.expenses.map((expense, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="w-[14%] px-3 py-2 text-center">
                      <input
                        type="date"
                        className={`w-full px-2 py-1 border rounded ${errors[`expenses.${index}.date`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        value={expense.date ? expense.date.split('T')[0] : ''}
                        onChange={(e) => handleExpenseChange(index, 'date', e.target.value)}
                        disabled={!formData.project}
                      />
                      {errors[`expenses.${index}.date`] && (
                        <div className="text-red-500 text-xs mt-1">
                          {errors[`expenses.${index}.date`]}
                        </div>
                      )}
                    </td>

                    <td className="w-[15%] px-3 py-2 text-center">
                      <select
                        className={`w-full px-2 py-1 border rounded ${errors[`expenses.${index}.expenseCategory`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        value={expense.expenseCategory}
                        onChange={(e) => handleExpenseChange(index, 'expenseCategory', e.target.value)}
                        disabled={!formData.project}
                      >
                        {expenseCategories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="w-[20%] px-3 py-2 text-center">
                      <input
                        type="text"
                        className={`w-full px-2 py-1 border rounded ${errors[`expenses.${index}.expenseDescription`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        value={expense.expenseDescription}
                        onChange={(e) => handleExpenseChange(index, 'expenseDescription', e.target.value)}
                        placeholder="Enter description"
                        disabled={!formData.project}
                      />
                      {errors[`expenses.${index}.expenseDescription`] && (
                        <div className="text-red-500 text-xs mt-1">
                          {errors[`expenses.${index}.expenseDescription`]}
                        </div>
                      )}
                    </td>

                    <td className="w-[12%] px-3 py-2 text-center">
                      <input
                        type="number"
                        className={`w-full px-2 py-1 border rounded ${errors[`expenses.${index}.amount`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        value={expense.amount}
                        onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        disabled={!formData.project}
                      />
                      {errors[`expenses.${index}.amount`] && (
                        <div className="text-red-500 text-xs mt-1">
                          {errors[`expenses.${index}.amount`]}
                        </div>
                      )}
                    </td>

                    <td className="w-[16%] px-3 py-2 text-center">
                      <select
                        className={`w-full px-2 py-1 border rounded ${errors[`expenses.${index}.paymentMethod`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        value={expense.paymentMethod}
                        onChange={(e) => handleExpenseChange(index, 'paymentMethod', e.target.value)}
                        disabled={!formData.project}
                      >
                        {paymentMethods.map(method => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="w-[17%] px-3 py-2 text-center">
                      <div className="relative flex items-center gap-2">
                        <input
                          type="file"
                          className="w-full text-xs"
                          onChange={(e) => handleFileUpload(index, e.target.files[0])}
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={!formData.project}
                        />
                        {expense.receipt && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              viewReceipt(expense.receipt);
                            }}
                            className="flex-shrink-0 text-blue-600 hover:text-blue-800 p-1 transition-colors duration-150"
                            title="View Receipt"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      {expense.receipt && (
                        <div className="text-xs text-green-600 mt-1 truncate">
                          ✓ {expense.receipt.name || expense.receipt.originalName || 'File uploaded'}
                        </div>
                      )}
                    </td>

                    <td className="w-[6%] px-3 py-2 text-center">
                      {formData.expenses.length > 1 && (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-red-600 hover:text-red-800 p-1"
                          onClick={() => removeExpenseRow(index)}
                          aria-label="Delete expense"
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
        </div>
      </div>

      {/* Total and Remarks */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-bold">
            Total Amount: ₹{calculateTotal().toFixed(2)}
          </div>


        </div>

        <FloatingInput
          label="Remarks (Optional)"
          value={formData.remarks || ''}
          onChange={(e) => handleMasterChange('remarks', e.target.value)}
          type="textarea"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          disabled={!formData.project || loading}
        >
          {loading ? 'Saving...' : 'Save Expenditure'}
        </button>
      </div>
    </div>
  );
};

export default MiscellaneousExpenditureForm;