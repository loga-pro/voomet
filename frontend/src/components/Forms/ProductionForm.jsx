import React, { useState, useEffect } from 'react';
import { projectsAPI, customersAPI, partsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import { 
  PlusCircleIcon, 
  MinusCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const ProductionForm = ({ production, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    projectName: '',
    overallProduction: {
      startDate: '',
      endDate: ''
    },
    productionDetails: [
      {
        date: '',
        partName: '',
        productionQuantityPlan: '',
        actualProduction: '',
        gap: '',
        reasonForDelay: '',
        remarks: ''
      }
    ],
    summary: {
      totalPlan: 0,
      totalActual: 0,
      totalGap: 0,
      efficiency: 0
    }
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [formSteps, setFormSteps] = useState(1);
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation constants
  const VALIDATION_RULES = {
    PRODUCTION_QUANTITY: {
      maxDigits: 8,
      allowDecimal: false,
      minValue: 1,
      maxValue: 99999999
    },
    REASON_FOR_DELAY: {
      maxLength: 200,
      allowNumbers: true,
      allowSpecialChars: true
    },
    REMARKS: {
      maxLength: 200,
      allowNumbers: true,
      allowSpecialChars: true
    }
  };

  useEffect(() => {
    if (production) {
      setFormData({
        customerName: production.customerName || '',
        projectName: production.projectName || '',
        overallProduction: {
          startDate: production.overallProduction?.startDate 
            ? production.overallProduction.startDate.split('T')[0] 
            : '',
          endDate: production.overallProduction?.endDate 
            ? production.overallProduction.endDate.split('T')[0] 
            : ''
        },
        productionDetails: production.productionDetails?.length > 0 
          ? production.productionDetails.map(detail => ({
              date: detail.date ? detail.date.split('T')[0] : '',
              partName: detail.partName || '',
              productionQuantityPlan: detail.productionQuantityPlan || '',
              actualProduction: detail.actualProduction || '',
              gap: detail.gap || '',
              reasonForDelay: detail.reasonForDelay || '',
              remarks: detail.remarks || ''
            }))
          : [{
              date: '',
              partName: '',
              productionQuantityPlan: '',
              actualProduction: '',
              gap: '',
              reasonForDelay: '',
              remarks: ''
            }],
        summary: production.summary || {
          totalPlan: 0,
          totalActual: 0,
          totalGap: 0,
          efficiency: 0
        }
      });
    }
  }, [production]);

  // Fetch customers, projects, and parts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, partsRes] = await Promise.all([
          customersAPI.getAll(),
          partsAPI.getAll()
        ]);
        
        setCustomers(customersRes.data || []);
        setParts(partsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Filter projects based on selected customer
  useEffect(() => {
    const fetchProjectsByCustomer = async () => {
      if (formData.customerName) {
        try {
          const response = await projectsAPI.getAll({ customerName: formData.customerName });
          setFilteredProjects(response.data || []);
        } catch (error) {
          console.error('Error fetching projects:', error);
          setFilteredProjects([]);
        }
      } else {
        setFilteredProjects([]);
      }
    };
    
    fetchProjectsByCustomer();
  }, [formData.customerName]);

  // Calculate summary when production details change
  useEffect(() => {
    const calculateSummary = () => {
      const totalPlan = formData.productionDetails.reduce((sum, detail) => 
        sum + (parseInt(detail.productionQuantityPlan) || 0), 0
      );
      
      const totalActual = formData.productionDetails.reduce((sum, detail) => 
        sum + (parseInt(detail.actualProduction) || 0), 0
      );
      
      const totalGap = totalPlan - totalActual;
      const efficiency = totalPlan > 0 ? ((totalActual / totalPlan) * 100) : 0;

      setFormData(prev => ({
        ...prev,
        summary: {
          totalPlan,
          totalActual,
          totalGap,
          efficiency: parseFloat(efficiency.toFixed(2))
        }
      }));
    };

    calculateSummary();
  }, [formData.productionDetails]);

  // Validation functions
  const validateProductionQuantity = (value) => {
    const rules = VALIDATION_RULES.PRODUCTION_QUANTITY;
    
    if (!value) return 'Production quantity is required';
    
    // Check if it's a valid integer
    if (!/^\d+$/.test(value)) {
      return 'Only whole numbers are allowed (no decimals)';
    }
    
    const numValue = parseInt(value, 10);
    
    // Check if value is within range
    if (numValue < rules.minValue) {
      return `Minimum value is ${rules.minValue}`;
    }
    
    if (numValue > rules.maxValue) {
      return `Maximum value is ${rules.maxValue}`;
    }
    
    // Check digit limit
    if (value.length > rules.maxDigits) {
      return `Maximum ${rules.maxDigits} digits allowed`;
    }
    
    return '';
  };

  const validateReasonForDelay = (value) => {
    const rules = VALIDATION_RULES.REASON_FOR_DELAY;
    
    if (!value) return ''; // Optional field
    
    if (value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    return '';
  };

  const validateRemarks = (value) => {
    const rules = VALIDATION_RULES.REMARKS;
    
    if (!value) return ''; // Optional field
    
    if (value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('overallProduction.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        overallProduction: {
          ...prev.overallProduction,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDetailChange = (index, e) => {
    const { name, value } = e.target;
    const updatedDetails = [...formData.productionDetails];
    
    // Validate input based on field type
    let validatedValue = value;
    
    // For production quantity fields, restrict to digits only and limit length
    if (name === 'productionQuantityPlan' || name === 'actualProduction') {
      // Remove any non-digit characters
      validatedValue = value.replace(/[^\d]/g, '');
      
      // Limit to 8 digits
      if (validatedValue.length > VALIDATION_RULES.PRODUCTION_QUANTITY.maxDigits) {
        validatedValue = validatedValue.slice(0, VALIDATION_RULES.PRODUCTION_QUANTITY.maxDigits);
      }
      
      // Remove leading zeros
      validatedValue = validatedValue.replace(/^0+/, '') || '0';
      
      // Update the value
      updatedDetails[index][name] = validatedValue;
      
      // Calculate gap if production quantity plan or actual production changes
      const plan = parseInt(updatedDetails[index].productionQuantityPlan) || 0;
      const actual = parseInt(updatedDetails[index].actualProduction) || 0;
      updatedDetails[index].gap = (plan - actual).toString();
    } 
    // For reasonForDelay and remarks, apply character limit
    else if (name === 'reasonForDelay' || name === 'remarks') {
      if (value.length <= VALIDATION_RULES.REASON_FOR_DELAY.maxLength) {
        updatedDetails[index][name] = value;
      } else {
        // If character limit exceeded, keep previous value
        return; // Don't update the field
      }
    }
    // For other fields
    else {
      updatedDetails[index][name] = value;
    }
    
    setFormData(prev => ({
      ...prev,
      productionDetails: updatedDetails
    }));

    // Clear error for this field
    if (errors[`productionDetails[${index}].${name}`]) {
      const updatedErrors = { ...errors };
      delete updatedErrors[`productionDetails[${index}].${name}`];
      setErrors(updatedErrors);
    }
  };

  const addDetailRow = () => {
    setFormData(prev => ({
      ...prev,
      productionDetails: [
        ...prev.productionDetails,
        {
          date: '',
          partName: '',
          productionQuantityPlan: '',
          actualProduction: '',
          gap: '',
          reasonForDelay: '',
          remarks: ''
        }
      ]
    }));
  };

  const removeDetailRow = (index) => {
    if (formData.productionDetails.length > 1) {
      const updatedDetails = [...formData.productionDetails];
      updatedDetails.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        productionDetails: updatedDetails
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate main fields
    if (!formData.customerName) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.projectName) {
      newErrors.projectName = 'Project name is required';
    }

    if (!formData.overallProduction.startDate) {
      newErrors['overallProduction.startDate'] = 'Start date is required';
    }

    if (!formData.overallProduction.endDate) {
      newErrors['overallProduction.endDate'] = 'End date is required';
    } else if (formData.overallProduction.startDate && 
               new Date(formData.overallProduction.endDate) < new Date(formData.overallProduction.startDate)) {
      newErrors['overallProduction.endDate'] = 'End date must be after start date';
    }

    // Validate production details
    const detailErrors = {};
    let hasValidDetails = false;
    
    formData.productionDetails.forEach((detail, index) => {
      const itemError = {};
      
      // Date validation
      if (!detail.date) {
        itemError.date = 'Date is required';
      } else if (formData.overallProduction.startDate && 
                 new Date(detail.date) < new Date(formData.overallProduction.startDate)) {
        itemError.date = 'Date must be within production period';
      } else if (formData.overallProduction.endDate && 
                 new Date(detail.date) > new Date(formData.overallProduction.endDate)) {
        itemError.date = 'Date must be within production period';
      }

      // Part name validation
      if (!detail.partName) {
        itemError.partName = 'Part name is required';
      }

      // Production quantity plan validation
      const planValidation = validateProductionQuantity(detail.productionQuantityPlan);
      if (planValidation) {
        itemError.productionQuantityPlan = planValidation;
      }

      // Actual production validation
      const actualValidation = validateProductionQuantity(detail.actualProduction);
      if (actualValidation) {
        itemError.actualProduction = actualValidation;
      }

      // Reason for delay validation
      const reasonValidation = validateReasonForDelay(detail.reasonForDelay);
      if (reasonValidation) {
        itemError.reasonForDelay = reasonValidation;
      }

      // Remarks validation
      const remarksValidation = validateRemarks(detail.remarks);
      if (remarksValidation) {
        itemError.remarks = remarksValidation;
      }

      if (Object.keys(itemError).length > 0) {
        detailErrors[index] = itemError;
      } else {
        hasValidDetails = true;
      }
    });

    if (Object.keys(detailErrors).length > 0) {
      newErrors.productionDetails = detailErrors;
    }

    if (!hasValidDetails) {
      newErrors.productionDetails = newErrors.productionDetails || {};
      newErrors.productionDetails.general = 'At least one valid production detail is required';
    }

    setErrors(newErrors);
    setShowValidation(true);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    // Validate current step
    if (formSteps === 1) {
      const stepErrors = {};
      if (!formData.customerName) stepErrors.customerName = 'Customer name is required';
      if (!formData.projectName) stepErrors.projectName = 'Project name is required';
      if (!formData.overallProduction.startDate) stepErrors['overallProduction.startDate'] = 'Start date is required';
      if (!formData.overallProduction.endDate) stepErrors['overallProduction.endDate'] = 'End date is required';
      
      if (Object.keys(stepErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...stepErrors }));
        return;
      }
    }
    
    setFormSteps(prev => prev + 1);
  };

  const prevStep = () => {
    setFormSteps(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        productionDetails: formData.productionDetails.map(detail => ({
          ...detail,
          productionQuantityPlan: parseInt(detail.productionQuantityPlan) || 0,
          actualProduction: parseInt(detail.actualProduction) || 0,
          gap: parseInt(detail.gap) || 0
        })),
        summary: {
          ...formData.summary
        }
      };

      onSubmit(submitData);
    } catch (error) {
      console.error('Error saving production data:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3" />
          <div>
            <p className="text-sm text-blue-700">
              Select the customer and project for production tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Customer and Project Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FloatingInput
          label="Customer Name"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          type="select"
          options={[
            { value: '', label: 'Select Customer' },
            ...customers.map(customer => ({ 
              value: customer.customerName, 
              label: customer.customerName 
            }))
          ]}
          error={showValidation && errors.customerName}
          required
          size="medium"
        />

        <FloatingInput
          label="Project Name"
          name="projectName"
          value={formData.projectName}
          onChange={handleChange}
          type="select"
          options={[
            { value: '', label: 'Select Project' },
            ...filteredProjects.map(project => ({ 
              value: project.projectName, 
              label: project.projectName 
            }))
          ]}
          error={showValidation && errors.projectName}
          disabled={!formData.customerName}
          required
          size="medium"
        />
      </div>

      {/* Overall Production Dates */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
          Overall Production Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FloatingInput
            label="Start Date"
            name="overallProduction.startDate"
            value={formData.overallProduction.startDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors['overallProduction.startDate']}
            required
            size="medium"
          />

          <FloatingInput
            label="End Date"
            name="overallProduction.endDate"
            value={formData.overallProduction.endDate}
            onChange={handleChange}
            type="date"
            min={formData.overallProduction.startDate}
            error={showValidation && errors['overallProduction.endDate']}
            required
            size="medium"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3" />
          <div>
            <p className="text-sm text-blue-700">
              Add daily production details. Gap will be calculated automatically.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              • Plan Qty & Actual Qty: Whole numbers only, max 8 digits
              <br />
              • Reason for Delay & Remarks: Max 200 characters
            </p>
          </div>
        </div>
      </div>

      {/* Production Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Plan</div>
          <div className="text-2xl font-bold text-blue-600">{formData.summary.totalPlan}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Actual</div>
          <div className="text-2xl font-bold text-green-600">{formData.summary.totalActual}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-xs font-medium text-gray-500 mb-1">Total Gap</div>
          <div className={`text-2xl font-bold ${formData.summary.totalGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formData.summary.totalGap}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-xs font-medium text-gray-500 mb-1">Efficiency</div>
          <div className={`text-2xl font-bold ${formData.summary.efficiency >= 90 ? 'text-green-600' : formData.summary.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {formData.summary.efficiency}%
          </div>
        </div>
      </div>

      {/* Production Details Table */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-green-500" />
              Production Details
            </h3>
            <p className="text-sm text-gray-500">Daily production tracking</p>
          </div>
          <button
            type="button"
            onClick={addDetailRow}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Part Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Plan Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Actual Qty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Gap
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Reason for Delay
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Remarks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.productionDetails.map((detail, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <FloatingInput
                      label=""
                      name="date"
                      value={detail.date}
                      onChange={(e) => handleDetailChange(index, e)}
                      type="date"
                      size="small"
                      className="min-w-[120px]"
                      error={showValidation && errors.productionDetails?.[index]?.date}
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <FloatingInput
                      label=""
                      name="partName"
                      value={detail.partName}
                      onChange={(e) => handleDetailChange(index, e)}
                      type="select"
                      size="small"
                      options={[
                        { value: '', label: 'Select Part' },
                        ...parts.map(part => ({ 
                          value: part.partName, 
                          label: part.partName 
                        }))
                      ]}
                      className="min-w-[150px]"
                      error={showValidation && errors.productionDetails?.[index]?.partName}
                      required
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <FloatingInput
                        label=""
                        name="productionQuantityPlan"
                        value={detail.productionQuantityPlan}
                        onChange={(e) => handleDetailChange(index, e)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        size="small"
                        className="min-w-[100px]"
                        error={showValidation && errors.productionDetails?.[index]?.productionQuantityPlan}
                        required
                      />
                      {detail.productionQuantityPlan && (
                        <div className="absolute right-2 top-2 text-xs text-gray-400">
                          {detail.productionQuantityPlan.length}/8
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <FloatingInput
                        label=""
                        name="actualProduction"
                        value={detail.actualProduction}
                        onChange={(e) => handleDetailChange(index, e)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        size="small"
                        className="min-w-[100px]"
                        error={showValidation && errors.productionDetails?.[index]?.actualProduction}
                        required
                      />
                      {detail.actualProduction && (
                        <div className="absolute right-2 top-2 text-xs text-gray-400">
                          {detail.actualProduction.length}/8
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`px-3 py-1 text-sm font-medium rounded-md ${
                      parseInt(detail.gap) > 0 ? 'bg-red-100 text-red-800' :
                      parseInt(detail.gap) < 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {detail.gap || '0'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <FloatingInput
                        label=""
                        name="reasonForDelay"
                        value={detail.reasonForDelay}
                        onChange={(e) => handleDetailChange(index, e)}
                        type="text"
                        size="small"
                        className="min-w-[150px]"
                        placeholder="e.g., Machine breakdown"
                        maxLength={VALIDATION_RULES.REASON_FOR_DELAY.maxLength}
                        error={showValidation && errors.productionDetails?.[index]?.reasonForDelay}
                      />
                      {detail.reasonForDelay && (
                        <div className="absolute right-2 top-2 text-xs text-gray-400">
                          {detail.reasonForDelay.length}/{VALIDATION_RULES.REASON_FOR_DELAY.maxLength}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <FloatingInput
                        label=""
                        name="remarks"
                        value={detail.remarks}
                        onChange={(e) => handleDetailChange(index, e)}
                        type="text"
                        size="small"
                        className="min-w-[150px]"
                        placeholder="Additional notes"
                        maxLength={VALIDATION_RULES.REMARKS.maxLength}
                        error={showValidation && errors.productionDetails?.[index]?.remarks}
                      />
                      {detail.remarks && (
                        <div className="absolute right-2 top-2 text-xs text-gray-400">
                          {detail.remarks.length}/{VALIDATION_RULES.REMARKS.maxLength}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formData.productionDetails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDetailRow(index)}
                        className="inline-flex items-center p-1.5 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Remove Row"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showValidation && errors.productionDetails?.general && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">{errors.productionDetails.general}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
        <div className="flex">
          <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
          <div>
            <p className="text-sm text-green-700">
              Review all production information before submitting.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Customer:</span>
              <span className="text-sm font-medium text-gray-900">{formData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Project:</span>
              <span className="text-sm font-medium text-gray-900">{formData.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Production Period:</span>
              <span className="text-sm font-medium text-gray-900">
                {formData.overallProduction.startDate} to {formData.overallProduction.endDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Records:</span>
              <span className="text-sm font-medium text-gray-900">{formData.productionDetails.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-500" />
            Production Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Plan Quantity:</span>
              <span className="text-sm font-medium text-blue-600">{formData.summary.totalPlan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Actual Quantity:</span>
              <span className="text-sm font-medium text-green-600">{formData.summary.totalActual}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Gap:</span>
              <span className={`text-sm font-medium ${formData.summary.totalGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formData.summary.totalGap}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-700">Overall Efficiency:</span>
                <span className={`text-xl font-bold ${formData.summary.efficiency >= 90 ? 'text-green-600' : formData.summary.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formData.summary.efficiency}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Summary Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Summary</h3>
        <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50 sticky top-0 z-10">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Part Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Plan Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Actual Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Gap</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Delay Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {formData.productionDetails.map((detail, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 text-sm text-gray-900">{detail.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{detail.partName}</td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{detail.productionQuantityPlan}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">{detail.actualProduction}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      parseInt(detail.gap) > 0 ? 'bg-red-100 text-red-800' :
                      parseInt(detail.gap) < 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {detail.gap || '0'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{detail.reasonForDelay || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{detail.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Navigation buttons for each step
  const renderStepNavigation = () => {
    if (formSteps === 1) {
      return (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            Next: Production Details
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        </div>
      );
    } else if (formSteps === 2) {
      return (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back: Project Details
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            Next: Review & Submit
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        </div>
      );
    } else if (formSteps === 3) {
      return (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back: Production Details
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : production ? 'Update Production' : 'Submit Production'}
          </button>
        </div>
      </div>
    );
  }
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* Step Indicator - Fixed at top */}
      <div className="flex-shrink-0 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formSteps >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`ml-2 text-sm font-medium ${formSteps >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
              Project Setup
            </div>
          </div>
          
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formSteps >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <div className={`ml-2 text-sm font-medium ${formSteps >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
              Production Details
            </div>
          </div>
          
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formSteps >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
            <div className={`ml-2 text-sm font-medium ${formSteps >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>
              Review & Submit
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA - This now includes everything inside scroll */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-180px)] px-1 py-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {errors.submit && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        {/* Form Steps Content */}
        {formSteps === 1 && renderStep1()}
        {formSteps === 2 && renderStep2()}
        {formSteps === 3 && renderStep3()}
      </div>

      {/* FIXED BOTTOM BUTTONS AREA - Navigation buttons stay fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white pt-4 mt-4">
        {renderStepNavigation()}
      </div>
    </form>
  );
};

export default ProductionForm;