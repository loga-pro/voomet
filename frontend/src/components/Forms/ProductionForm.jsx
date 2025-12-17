import React, { useState, useEffect } from 'react';
import { inhouseMilestonesAPI, partsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import {
  PlusCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Constants and configurations
const VALIDATION_RULES = {
  PRODUCTION_QUANTITY: { maxDigits: 8, allowDecimal: false, minValue: 1, maxValue: 99999999 },
  REASON_FOR_DELAY: { maxLength: 200 },
  REMARKS: { maxLength: 200 }
};

const INITIAL_FORM_DATA = {
  customerName: '',
  projectName: '',
  milestoneStartDate: '',
  milestoneEndDate: '',
  startDate: '',
  endDate: '',
  items: [{
    sNo: 1,
    date: '',
    partName: '',
    productionQuantityPlan: '',
    actualProduction: '',
    gap: '',
    reasonForDelay: '',
    remarks: ''
  }]
};

// Helper functions
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateGap = (plan, actual) => {
  const planEmpty = plan === '' || plan == null;
  const actualEmpty = actual === '' || actual == null;
  if (planEmpty && actualEmpty) return '';
  const planNum = parseInt(plan) || 0;
  const actualNum = parseInt(actual) || 0;
  return String(planNum - actualNum);
};

const validateDate = (value) => {
  if (!value) return 'Date is required';
  const d = new Date(value);
  if (d > new Date()) return 'Date cannot be in the future';
  return '';
};

const validateProductionQuantity = (v) => {
  if (v === '' || v == null) return 'Required';
  if (!/^\d+$/.test(v)) return 'Whole numbers only';
  return '';
};

// Custom hooks
const useFormData = (production) => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  useEffect(() => {
    if (!production) return;

    const formattedData = {
      customerName: production.customerName || '',
      projectName: production.projectName || '',
      milestoneStartDate: production.milestoneStartDate ? formatDateForInput(production.milestoneStartDate) : '',
      milestoneEndDate: production.milestoneEndDate ? formatDateForInput(production.milestoneEndDate) : '',
      startDate: production.startDate ? formatDateForInput(production.startDate) : '',
      endDate: production.endDate ? formatDateForInput(production.endDate) : '',
      items: production.items?.length > 0
        ? production.items.map((it, i) => ({
          sNo: i + 1,
          date: it.date ? formatDateForInput(it.date) : '',
          partName: it.partName || '',
          productionQuantityPlan: it.productionQuantityPlan || '',
          actualProduction: it.actualProduction || '',
          gap: calculateGap(it.productionQuantityPlan, it.actualProduction),
          reasonForDelay: it.reasonForDelay || '',
          remarks: it.remarks || ''
        }))
        : INITIAL_FORM_DATA.items
    };

    setFormData(formattedData);
  }, [production]);

  return [formData, setFormData];
};

const useExternalData = () => {
  const [customers, setCustomers] = useState([]);
  const [parts, setParts] = useState([]);
  const [inhouseMilestones, setInhouseMilestones] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [milestonesRes, partsRes] = await Promise.all([
          inhouseMilestonesAPI.getAll(),
          partsAPI.getAll()
        ]);

        const milestones = milestonesRes.data?.milestones || milestonesRes.data || [];
        setInhouseMilestones(milestones);

        const uniqueCustomers = [...new Set(milestones.map(m => m.customer).filter(Boolean))];
        setCustomers(uniqueCustomers.map(c => ({ customerName: c })));

        setParts(partsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch external data:', err);
      }
    };

    fetchData();
  }, []);

  return { customers, parts, inhouseMilestones };
};

const useFilteredProjects = (customerName, inhouseMilestones) => {
  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    if (!customerName) {
      setFilteredProjects([]);
      return;
    }

    const customerMilestones = inhouseMilestones.filter(m => m.customer === customerName);
    const uniqueProjects = [...new Set(customerMilestones.map(m => m.projectName).filter(Boolean))];
    setFilteredProjects(uniqueProjects.map(p => ({ projectName: p })));
  }, [customerName, inhouseMilestones]);

  return filteredProjects;
};

const GapDisplay = ({ gap }) => {
  const gapNum = gap === '' ? null : parseInt(gap, 10);
  const showColor = gapNum !== null && !isNaN(gapNum) && gapNum !== 0;

  const gapStyle = showColor
    ? (gapNum > 0
      ? 'bg-red-50 text-red-700 border border-red-100'
      : 'bg-yellow-50 text-yellow-700 border border-yellow-100')
    : 'bg-white text-gray-700 border border-gray-200';

  return (
    <div className={`w-full px-3 py-2 rounded-md ${gapStyle}`}>
      <span className="text-sm font-medium">{gap === '' ? '' : gap}</span>
    </div>
  );
};

// ProductionItemRow with responsive design and Part Name as input field
const ProductionItemRow = ({
  item,
  index,
  onItemChange,
  onRemove,
  showValidation,
  errors,
  parts,
  totalItems
}) => {
  // Use state to track window size for responsive behavior
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  if (isMobile) {
    // Mobile view - stack everything vertically
    return (
      <div className="border-b border-gray-200 p-4 mb-4 bg-white rounded-lg shadow-sm">
        {/* Row Header with S.No and Remove Button */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-blue-700">{item.sNo}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-700">Item {item.sNo}</h3>
          </div>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="h-8 w-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
            title={totalItems > 1 ? 'Delete row' : 'Clear row'}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Form Fields in Stack */}
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date*
            </label>
            <FloatingInput
              value={item.date}
              onChange={(e) => onItemChange(index, 'date', e.target.value)}
              type="date"
              error={showValidation && errors.items?.[index]?.date}
              size="small"
              className="w-full"
            />
          </div>

          {/* Part Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Part Name*
            </label>
            <FloatingInput
              value={item.partName}
              onChange={(e) => onItemChange(index, 'partName', e.target.value)}
              type="text"
              error={showValidation && errors.items?.[index]?.partName}
              size="small"
              className="w-full"
              placeholder="Enter part name"
              list={`partName-${index}`}
            />
            <datalist id={`partName-${index}`}>
              {parts.map((part, i) => (
                <option key={i} value={part.partName}>
                  {part.partName}
                </option>
              ))}
            </datalist>
          </div>

          {/* Production Quantities - Side by side on mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Plan Quantity*
              </label>
              <FloatingInput
                value={item.productionQuantityPlan}
                onChange={(e) => onItemChange(index, 'productionQuantityPlan', e.target.value)}
                type="text"
                inputMode="numeric"
                size="small"
                error={showValidation && errors.items?.[index]?.productionQuantityPlan}
                className="w-full"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Actual Production*
              </label>
              <FloatingInput
                value={item.actualProduction}
                onChange={(e) => onItemChange(index, 'actualProduction', e.target.value)}
                type="text"
                inputMode="numeric"
                size="small"
                error={showValidation && errors.items?.[index]?.actualProduction}
                className="w-full"
                placeholder="0"
              />
            </div>
          </div>

          {/* Gap Display */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Gap
            </label>
            <GapDisplay gap={item.gap} />
          </div>

          {/* Reason for Delay */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reasons for Delay
            </label>
            <FloatingInput
              value={item.reasonForDelay}
              onChange={(e) => onItemChange(index, 'reasonForDelay', e.target.value)}
              type="text"
              size="small"
              placeholder="Enter reason"
              maxLength={VALIDATION_RULES.REASON_FOR_DELAY.maxLength}
              error={showValidation && errors.items?.[index]?.reasonForDelay}
              className="w-full"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <FloatingInput
              value={item.remarks}
              onChange={(e) => onItemChange(index, 'remarks', e.target.value)}
              type="textarea"
              rows={2}
              size="small"
              placeholder="Enter remarks"
              maxLength={VALIDATION_RULES.REMARKS.maxLength}
              error={showValidation && errors.items?.[index]?.remarks}
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // Desktop/Tablet view - table row
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {/* S.No */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-gray-800">{item.sNo}</span>
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3" style={{ minWidth: '180px' }}>
        <FloatingInput
          value={item.date}
          onChange={(e) => onItemChange(index, 'date', e.target.value)}
          type="date"
          error={showValidation && errors.items?.[index]?.date}
          size="small"
          hideLabel
          className="w-full"
        />
      </td>

      {/* Part Name - Input field with datalist for suggestions */}
      <td className="px-4 py-3" style={{ minWidth: '250px' }}>
        <div className="relative">
          <FloatingInput
            value={item.partName}
            onChange={(e) => onItemChange(index, 'partName', e.target.value)}
            type="text"
            error={showValidation && errors.items?.[index]?.partName}
            size="small"
            hideLabel
            className="w-full"
            placeholder="Enter part name"
            list={`partName-${index}`}
          />
          <datalist id={`partName-${index}`}>
            {parts.map((part, i) => (
              <option key={i} value={part.partName}>
                {part.partName}
              </option>
            ))}
          </datalist>
        </div>
      </td>

      {/* Production Quantity - Plan */}
      <td className="px-4 py-3" style={{ minWidth: '180px' }}>
        <FloatingInput
          value={item.productionQuantityPlan}
          onChange={(e) => onItemChange(index, 'productionQuantityPlan', e.target.value)}
          type="text"
          inputMode="numeric"
          size="small"
          hideLabel
          error={showValidation && errors.items?.[index]?.productionQuantityPlan}
          className="w-full"
          placeholder="0"
        />
      </td>

      {/* Production Quantity - Actual Prod */}
      <td className="px-4 py-3" style={{ minWidth: '180px' }}>
        <FloatingInput
          value={item.actualProduction}
          onChange={(e) => onItemChange(index, 'actualProduction', e.target.value)}
          type="text"
          inputMode="numeric"
          size="small"
          hideLabel
          error={showValidation && errors.items?.[index]?.actualProduction}
          className="w-full"
          placeholder="0"
        />
      </td>

      {/* Gap */}
      <td className="px-4 py-3" style={{ minWidth: '120px' }}>
        <GapDisplay gap={item.gap} />
      </td>

      {/* Reasons for Delay */}
      <td className="px-4 py-3" style={{ minWidth: '250px' }}>
        <FloatingInput
          value={item.reasonForDelay}
          onChange={(e) => onItemChange(index, 'reasonForDelay', e.target.value)}
          type="text"
          size="small"
          hideLabel
          placeholder="Enter reason"
          maxLength={VALIDATION_RULES.REASON_FOR_DELAY.maxLength}
          error={showValidation && errors.items?.[index]?.reasonForDelay}
          className="w-full"
        />
      </td>

      {/* Remarks */}
      <td className="px-4 py-3" style={{ minWidth: '250px' }}>
        <FloatingInput
          value={item.remarks}
          onChange={(e) => onItemChange(index, 'remarks', e.target.value)}
          type="textarea"
          rows={2}
          size="small"
          hideLabel
          placeholder="Enter remarks"
          maxLength={VALIDATION_RULES.REMARKS.maxLength}
          error={showValidation && errors.items?.[index]?.remarks}
          className="w-full"
        />
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="h-8 w-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
            title={totalItems > 1 ? 'Delete row' : 'Clear row'}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Responsive table header
const ItemsTableHeader = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  if (isMobile) {
    return null; // No table header on mobile
  }

  return (
    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
      <tr className="text-left text-sm font-medium text-gray-700">
        <th scope="col" className="px-4 py-3 text-center" style={{ minWidth: '80px' }}>S.No</th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '180px' }}>Date*</th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '250px' }}>Part Name*</th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '180px' }}>
          <div className="flex flex-col">
            <span>Production*</span>
            <span className="text-xs font-normal text-gray-500 mt-1">Planed Quantity*</span>
          </div>
        </th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '180px' }}>
          <div className="flex flex-col">
            <span>Production*</span>
            <span className="text-xs font-normal text-gray-500 mt-1">Actual Production*</span>
          </div>
        </th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '120px' }}>Gap</th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '250px' }}>Reasons for Delay*</th>
        <th scope="col" className="px-4 py-3" style={{ minWidth: '250px' }}>Remarks*</th>
        <th scope="col" className="px-4 py-3 text-center" style={{ minWidth: '100px' }}>Action</th>
      </tr>
    </thead>
  );
};

const EmptyItemsState = ({ onAddItem }) => (
  <div className="px-6 py-12 text-center">
    <div className="flex flex-col items-center justify-center text-gray-400">
      <PlusCircleIcon className="h-12 w-12 mb-3 text-gray-300" />
      <p className="text-sm mb-4">No production items added</p>
      <button
        type="button"
        onClick={onAddItem}
        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
      >
        <PlusCircleIcon className="h-4 w-4 mr-2" />
        Add First Item
      </button>
    </div>
  </div>
);

const FormFooter = ({ itemCount, onCancel, onSubmit, isSubmitting, loading, isEditMode }) => (
  <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-200 gap-4">
    <div className="flex items-center gap-4">
      <div className="flex items-center text-sm text-gray-600">
        <span className="bg-gray-100 px-3 py-1 rounded-md">
          Total Items: <span className="font-semibold">{itemCount}</span>
        </span>
      </div>
    </div>
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading || isSubmitting}
        className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            {isEditMode ? 'Update Production' : 'Create Production'}
          </>
        )}
      </button>
    </div>
  </div>
);

// Responsive Summary Row
const SummaryRow = ({ summary }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  if (isMobile) {
    return (
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-white rounded border">
            <div className="text-xs text-gray-500 mb-1">Total Plan</div>
            <div className="text-lg font-bold text-gray-900">{summary.totalPlan}</div>
          </div>
          <div className="text-center p-3 bg-white rounded border">
            <div className="text-xs text-gray-500 mb-1">Total Actual</div>
            <div className="text-lg font-bold text-gray-900">{summary.totalActual}</div>
          </div>
          <div className="text-center p-3 bg-white rounded border">
            <div className="text-xs text-gray-500 mb-1">Total Gap</div>
            <div className={`text-lg font-bold ${summary.totalGap !== 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {summary.totalGap}
            </div>
          </div>
          <div className="text-center p-3 bg-white rounded border">
            <div className="text-xs text-gray-500 mb-1">Efficiency</div>
            <div className={`text-lg font-bold ${summary.efficiency >= 90 ? 'text-green-600' : summary.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
              {summary.efficiency}%
            </div>
          </div>
        </div>
      </div>
    );
  }
};

// Main component
const ProductionForm = ({ production, onSubmit, onCancel, showSuccess, showError }) => {
  const [formData, setFormData] = useFormData(production);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const { customers, parts, inhouseMilestones } = useExternalData();
  const filteredProjects = useFilteredProjects(formData.customerName, inhouseMilestones);

  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Auto-calculate gaps when plan/actual changes
  useEffect(() => {
    const updatedItems = formData.items.map(item => ({
      ...item,
      gap: calculateGap(item.productionQuantityPlan, item.actualProduction)
    }));

    setFormData(prev => ({ ...prev, items: updatedItems }));
  }, [formData.items.map(i => `${i.productionQuantityPlan}-${i.actualProduction}`).join(',')]);

  // Auto-fetch milestone dates when project is selected
  useEffect(() => {
    if (formData.customerName && formData.projectName) {
      const selectedMilestone = inhouseMilestones.find(
        m => m.customer === formData.customerName && m.projectName === formData.projectName
      );
      if (selectedMilestone) {
        setFormData(prev => ({
          ...prev,
          milestoneStartDate: selectedMilestone.startDate ? formatDateForInput(selectedMilestone.startDate) : '',
          milestoneEndDate: selectedMilestone.endDate ? formatDateForInput(selectedMilestone.endDate) : ''
        }));
      }
    }
  }, [formData.customerName, formData.projectName, inhouseMilestones]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'customerName') {
      setFormData(prev => ({
        ...prev,
        projectName: '',
        milestoneStartDate: '',
        milestoneEndDate: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    let processedValue = value;

    // Apply formatting/rules based on field type
    switch (field) {
      case 'productionQuantityPlan':
      case 'actualProduction':
        processedValue = value.replace(/[^\d]/g, '');
        processedValue = processedValue.replace(/^0+/, '') || (value === '' ? '' : '0');
        break;
      case 'reasonForDelay':
        if (value.length > VALIDATION_RULES.REASON_FOR_DELAY.maxLength) return;
        break;
      case 'remarks':
        if (value.length > VALIDATION_RULES.REMARKS.maxLength) return;
        break;
      default:
        break;
    }

    updatedItems[index] = { ...updatedItems[index], [field]: processedValue };
    setFormData(prev => ({ ...prev, items: updatedItems }));

    // Clear any existing errors for this field
    if (errors.items?.[index]?.[field]) {
      const errorsCopy = { ...errors };
      delete errorsCopy.items[index][field];
      if (Object.keys(errorsCopy.items[index]).length === 0) {
        delete errorsCopy.items[index];
      }
      setErrors(errorsCopy);
    }
  };

  const addItem = () => {
    const newItem = {
      sNo: formData.items.length + 1,
      date: '',
      partName: '',
      productionQuantityPlan: '',
      actualProduction: '',
      gap: '',
      reasonForDelay: '',
      remarks: ''
    };

    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items];
      updatedItems.splice(index, 1);
      updatedItems.forEach((item, i) => (item.sNo = i + 1));

      setFormData(prev => ({ ...prev, items: updatedItems }));

      // Clean up errors
      if (errors.items?.[index]) {
        const errorsCopy = { ...errors };
        errorsCopy.items.splice(index, 1);
        setErrors(errorsCopy);
      }
    } else {
      // Clear the single row
      setFormData(prev => ({ ...prev, items: [INITIAL_FORM_DATA.items[0]] }));

      if (errors.items) {
        const errorsCopy = { ...errors };
        delete errorsCopy.items;
        setErrors(errorsCopy);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic form validation
    if (!formData.customerName) newErrors.customerName = 'Customer required';
    if (!formData.projectName) newErrors.projectName = 'Project required';
    if (!formData.startDate) newErrors.startDate = 'Start date required';
    if (!formData.endDate) newErrors.endDate = 'End date required';

    // Items validation
    const itemErrors = [];
    let hasValidItem = false;

    formData.items.forEach((item, index) => {
      const itemError = {};

      const dateError = validateDate(item.date);
      if (dateError) itemError.date = dateError;

      if (!item.partName) itemError.partName = 'Part required';

      const planError = validateProductionQuantity(item.productionQuantityPlan);
      if (planError) itemError.productionQuantityPlan = planError;

      const actualError = validateProductionQuantity(item.actualProduction);
      if (actualError) itemError.actualProduction = actualError;

      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      } else {
        hasValidItem = true;
      }
    });

    if (itemErrors.length > 0) {
      newErrors.items = itemErrors;
    }

    if (!hasValidItem) {
      newErrors.items = { ...newErrors.items, general: 'At least one valid item required' };
    }

    setErrors(newErrors);
    setShowValidation(true);
    return Object.keys(newErrors).length === 0;
  };

  const calculateSummary = () => {
    const totalPlan = formData.items.reduce((sum, item) =>
      sum + (parseInt(item.productionQuantityPlan) || 0), 0);
    const totalActual = formData.items.reduce((sum, item) =>
      sum + (parseInt(item.actualProduction) || 0), 0);
    const totalGap = formData.items.reduce((sum, item) =>
      sum + (parseInt(item.gap) || 0), 0);
    const efficiency = totalPlan > 0
      ? parseFloat(((totalActual / totalPlan) * 100).toFixed(2))
      : 0;

    return { totalPlan, totalActual, totalGap, efficiency };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showError?.('Please fix form errors');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const payload = {
        customerName: formData.customerName,
        projectName: formData.projectName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        productionDetails: formData.items.map(item => ({
          date: item.date,
          partName: item.partName,
          productionQuantityPlan: parseInt(item.productionQuantityPlan) || 0,
          actualProduction: parseInt(item.actualProduction) || 0,
          gap: parseInt(item.gap) || 0,
          reasonForDelay: item.reasonForDelay,
          remarks: item.remarks
        }))
      };

      await onSubmit(payload);
    } catch (err) {
      console.error('Submission error:', err);
      showError?.('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const summary = calculateSummary();

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col bg-white rounded-lg shadow-sm">
      {/* Header Section */}
      <div className="flex-shrink-0 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <FloatingInput
            label="Customer name"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            type="select"
            options={[{ value: '', label: 'Select Customer' }, ...customers.map(c => ({ value: c.customerName, label: c.customerName }))]}
            error={showValidation && errors.customerName}
            required
            size={isMobile ? "small" : "medium"}
          />
          <FloatingInput
            label="Project Name"
            name="projectName"
            value={formData.projectName}
            onChange={handleChange}
            type="select"
            options={[{ value: '', label: 'Select Project' }, ...filteredProjects.map(p => ({ value: p.projectName, label: p.projectName }))]}
            error={showValidation && errors.projectName}
            required
            size={isMobile ? "small" : "medium"}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-2">
          <FloatingInput
            label="Project Start Date"
            name="milestoneStartDate"
            value={formData.milestoneStartDate}
            onChange={() => { }}
            type="date"
            readOnly
            size="small"
            className="bg-gray-50 cursor-not-allowed"
          />
          <FloatingInput
            label="Project End Date"
            name="milestoneEndDate"
            value={formData.milestoneEndDate}
            onChange={() => { }}
            type="date"
            readOnly
            size="small"
            className="bg-gray-50 cursor-not-allowed"
          />
          <FloatingInput
            label="Production Start Date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors.startDate}
            required
            size="small"
          />
          <FloatingInput
            label="Production End Date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors.endDate}
            required
            size="small"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4 md:pb-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
          {/* Table Header with Add Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 bg-gray-50 gap-3">
            <h3 className="text-base md:text-lg font-medium text-gray-900">Production Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" /> Add Item
            </button>
          </div>


          {/* Table Container with Horizontal and Vertical Scroll */}
          {/* Max height calculated: header (~60px) + 4 rows (~80px each) = ~380px */}
          <div className="flex-1 overflow-x-auto" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {isMobile ? (
              // Mobile view - stacked cards
              <div className="p-4 space-y-4">
                {formData.items.length === 0 ? (
                  <EmptyItemsState onAddItem={addItem} />
                ) : (
                  <>
                    {formData.items.map((item, index) => (
                      <ProductionItemRow
                        key={index}
                        item={item}
                        index={index}
                        onItemChange={handleItemChange}
                        onRemove={removeItem}
                        showValidation={showValidation}
                        errors={errors}
                        parts={parts}
                        totalItems={formData.items.length}
                      />
                    ))}
                  </>
                )}
              </div>
            ) : (
              // Desktop view - table with sticky header
              <table className="min-w-full divide-y divide-gray-200">
                <ItemsTableHeader />
                <tbody className="divide-y divide-gray-200 bg-white">
                  {formData.items.length === 0 ? (
                    <tr>
                      <td colSpan="9">
                        <EmptyItemsState onAddItem={addItem} />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {formData.items.map((item, index) => (
                        <ProductionItemRow
                          key={index}
                          item={item}
                          index={index}
                          onItemChange={handleItemChange}
                          onRemove={removeItem}
                          showValidation={showValidation}
                          errors={errors}
                          parts={parts}
                          totalItems={formData.items.length}
                        />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            )}

            {/* Summary Row - always shown */}
            <SummaryRow summary={summary} />
          </div>

          {showValidation && errors.items?.general && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center text-sm text-red-700">
              <InformationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{errors.items.general}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 md:p-6 bg-white">
        <FormFooter
          itemCount={formData.items.length}
          onCancel={onCancel}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          loading={loading}
          isEditMode={!!production}
        />
      </div>
    </form>
  );
};

export default ProductionForm;