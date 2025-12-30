import React, { useState, useEffect } from 'react';
import {
  PlusCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
import FloatingInput from './FloatingInput';
import { purchaseRequestsAPI, partsAPI, inhouseMilestonesAPI } from '../../services/api';

const scopeOptions = [
  { value: '', label: 'Select Scope' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'data', label: 'Data' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'partition', label: 'Partition' },
  { value: 'fire_and_safety', label: 'Fire and Safety' },
  { value: 'access', label: 'Access' }
];

const unitTypeOptions = [
  { value: '', label: 'Select Unit' },
  { value: 'pcs', label: 'PCS' },
  { value: 'm', label: 'Meter' },
  { value: 'sqm', label: 'SQM' },
  { value: 'kg', label: 'KG' },
  { value: 'l', label: 'Liter' },
  { value: 'roll', label: 'Roll' },
  { value: 'set', label: 'Set' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' }
];

const PurchaseRequestForm = ({ purchaseRequest, onSubmit, onCancel, showSuccess, showError }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    projectName: '',
    milestoneStartDate: '',
    milestoneEndDate: '',
    startDate: '',
    endDate: '',
    items: [
      {
        sNo: 1,
        description: '',
        area: '',
        code: '',
        specification: '',
        unitType: '',
        quantity: '',
        thickness: '',
        remark: '',
        image: null
      }
    ],
    hardwareItems: [
      {
        sNo: 1,
        description: '',
        size: '',
        thickness: '',
        specification: '',
        quantity: '',
        image: null
      }
    ],
    remarks: '',
    status: 'pending'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [inhouseMilestones, setInhouseMilestones] = useState([]);
  const [inhouseCustomers, setInhouseCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' or 'hardware'
  const [imagePreview, setImagePreview] = useState(null);

  const VALIDATION_RULES = {
    REMARKS: { maxLength: 200 },
    DESCRIPTION: { maxLength: 200 },
    AREA: { maxLength: 100 },
    CODE: { maxLength: 50 },
    SPECIFICATION: { maxLength: 300 },
    THICKNESS: { maxLength: 50 },
    ITEM_REMARK: { maxLength: 150 },
    QUANTITY: { maxDigits: 8, allowDecimal: true, minValue: 0.01, maxValue: 99999999 },
    SIZE: { maxLength: 50 },
    IMAGE: { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff', 'application/pdf'] }
  };

  const getAllowedFileTypesText = () => {
    return "Images (JPEG, PNG, GIF, BMP, WebP, SVG, TIFF) and PDF files";
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (purchaseRequest) {
      setFormData({
        customerName: purchaseRequest.customerName || '',
        projectName: purchaseRequest.projectName || '',
        milestoneStartDate: purchaseRequest.milestoneStartDate ? formatDateForInput(purchaseRequest.milestoneStartDate) : '',
        milestoneEndDate: purchaseRequest.milestoneEndDate ? formatDateForInput(purchaseRequest.milestoneEndDate) : '',
        startDate: purchaseRequest.startDate ? formatDateForInput(purchaseRequest.startDate) : '',
        endDate: purchaseRequest.endDate ? formatDateForInput(purchaseRequest.endDate) : '',
        items: purchaseRequest.items?.length > 0
          ? purchaseRequest.items.map((item, index) => ({
            sNo: index + 1,
            description: item.description || '',
            area: item.area || '',
            code: item.code || '',
            specification: item.specification || '',
            unitType: item.unitType || '',
            quantity: item.quantity || '',
            thickness: item.thickness || '',
            remark: item.remark || '',
            image: item.image ? {
              uid: item._id || `image-${index}`,
              name: item.imageName || `image-${index}`,
              size: item.imageSize || 0,
              type: item.imageType || 'image/jpeg',
              status: 'done',
              url: item.image,
              isExisting: true
            } : null
          }))
          : [{
            sNo: 1,
            description: '',
            area: '',
            code: '',
            specification: '',
            unitType: '',
            quantity: '',
            thickness: '',
            remark: '',
            image: null
          }],
        hardwareItems: purchaseRequest.hardwareItems?.length > 0
          ? purchaseRequest.hardwareItems.map((item, index) => ({
            sNo: index + 1,
            description: item.description || '',
            size: item.size || '',
            thickness: item.thickness || '',
            specification: item.specification || '',
            quantity: item.quantity || '',
            image: item.image ? {
              uid: item._id || `image-${index}`,
              name: item.imageName || `image-${index}`,
              size: item.imageSize || 0,
              type: item.imageType || 'image/jpeg',
              status: 'done',
              url: item.image,
              isExisting: true
            } : null
          }))
          : [{
            sNo: 1,
            description: '',
            size: '',
            thickness: '',
            specification: '',
            quantity: '',
            image: null
          }],
        remarks: purchaseRequest.remarks || '',
        status: purchaseRequest.status || 'pending'
      });
    }
  }, [purchaseRequest]);

  useEffect(() => {
    const fetchInhouseMilestones = async () => {
      try {
        const milestonesRes = await inhouseMilestonesAPI.getAll();
        const milestones = milestonesRes.data?.milestones || milestonesRes.data || [];
        setInhouseMilestones(milestones);
        const uniqueCustomers = [...new Set(milestones.map(m => m.customer).filter(Boolean))];
        setInhouseCustomers(uniqueCustomers.map(c => ({ customerName: c })));
      } catch (error) {
        console.error('Error fetching inhouse milestones:', error);
      }
    };
    fetchInhouseMilestones();
  }, []);

  useEffect(() => {
    if (formData.customerName) {
      const customerMilestones = inhouseMilestones.filter(milestone => milestone.customer === formData.customerName);
      const uniqueProjects = [...new Set(customerMilestones.map(m => m.projectName).filter(Boolean))];
      setFilteredProjects(uniqueProjects.map(p => ({ projectName: p })));
    } else {
      setFilteredProjects([]);
    }
  }, [formData.customerName, inhouseMilestones]);

  useEffect(() => {
    if (formData.customerName && formData.projectName) {
      const selectedMilestone = inhouseMilestones.find(m => m.customer === formData.customerName && m.projectName === formData.projectName);
      if (selectedMilestone) {
        setFormData(prev => ({
          ...prev,
          milestoneStartDate: selectedMilestone.startDate ? formatDateForInput(selectedMilestone.startDate) : '',
          milestoneEndDate: selectedMilestone.endDate ? formatDateForInput(selectedMilestone.endDate) : ''
        }));
      }
    }
  }, [formData.customerName, formData.projectName, inhouseMilestones]);

  // Validation functions
  const validateDescription = (value) => {
    if (!value) return 'Description is required';
    if (value.length > VALIDATION_RULES.DESCRIPTION.maxLength)
      return `Maximum ${VALIDATION_RULES.DESCRIPTION.maxLength} characters allowed`;
    return '';
  };

  const validateArea = (value) => {
    if (!value) return 'Area is required';
    if (value.length > VALIDATION_RULES.AREA.maxLength)
      return `Maximum ${VALIDATION_RULES.AREA.maxLength} characters allowed`;
    return '';
  };

  const validateCode = (value) => {
    if (!value) return 'Code is required';
    if (value.length > VALIDATION_RULES.CODE.maxLength)
      return `Maximum ${VALIDATION_RULES.CODE.maxLength} characters allowed`;
    return '';
  };

  const validateQuantity = (value) => {
    if (!value) return 'Quantity is required';
    if (!/^\d*\.?\d+$/.test(value)) return 'Enter a valid number';
    const numValue = parseFloat(value);
    if (numValue < VALIDATION_RULES.QUANTITY.minValue)
      return `Minimum value is ${VALIDATION_RULES.QUANTITY.minValue}`;
    if (numValue > VALIDATION_RULES.QUANTITY.maxValue)
      return `Maximum value is ${VALIDATION_RULES.QUANTITY.maxValue.toLocaleString()}`;
    return '';
  };

  const validateThickness = (value) => {
    if (value && value.length > VALIDATION_RULES.THICKNESS.maxLength)
      return `Maximum ${VALIDATION_RULES.THICKNESS.maxLength} characters allowed`;
    return '';
  };

  const validateSize = (value) => {
    if (value && value.length > VALIDATION_RULES.SIZE.maxLength)
      return `Maximum ${VALIDATION_RULES.SIZE.maxLength} characters allowed`;
    return '';
  };

  const validateItemRemark = (value) => {
    if (value && value.length > VALIDATION_RULES.ITEM_REMARK.maxLength)
      return `Maximum ${VALIDATION_RULES.ITEM_REMARK.maxLength} characters allowed`;
    return '';
  };

  const validateImage = (file) => {
    if (!file) return '';
    if (!VALIDATION_RULES.IMAGE.allowedTypes.includes(file.type))
      return 'Only JPG, PNG, GIF images are allowed';
    if (file.size > VALIDATION_RULES.IMAGE.maxSize)
      return `File size must be less than ${VALIDATION_RULES.IMAGE.maxSize / (1024 * 1024)}MB`;
    return '';
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    let validatedValue = value;

    if (name === 'remarks') {
      if (value.length <= VALIDATION_RULES.REMARKS.maxLength) validatedValue = value;
      else return;
    }

    setFormData(prev => ({ ...prev, [name]: validatedValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'customerName') {
      setFormData(prev => ({ ...prev, projectName: '', milestoneStartDate: '', milestoneEndDate: '', startDate: '', endDate: '' }));
    }
  };

  // Material items handlers
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    let validatedValue = value;

    if (field === 'quantity') {
      validatedValue = value.replace(/[^\d.]/g, '');
      const parts = validatedValue.split('.');
      if (parts.length > 2) validatedValue = parts[0] + '.' + parts.slice(1).join('');
      if (parts[1] && parts[1].length > 2) validatedValue = parts[0] + '.' + parts[1].slice(0, 2);
      if (validatedValue.startsWith('.')) validatedValue = '0' + validatedValue;
      updatedItems[index][field] = validatedValue;
    } else if (field === 'description') {
      if (value.length <= VALIDATION_RULES.DESCRIPTION.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'area') {
      if (value.length <= VALIDATION_RULES.AREA.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'code') {
      if (value.length <= VALIDATION_RULES.CODE.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'specification') {
      if (value.length <= VALIDATION_RULES.SPECIFICATION.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'thickness') {
      if (value.length <= VALIDATION_RULES.THICKNESS.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'remark') {
      if (value.length <= VALIDATION_RULES.ITEM_REMARK.maxLength) updatedItems[index][field] = value;
      else return;
    } else {
      updatedItems[index][field] = value;
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));

    if (errors.items && errors.items[index] && errors.items[index][field]) {
      const updatedErrors = { ...errors };
      delete updatedErrors.items[index][field];
      if (Object.keys(updatedErrors.items[index] || {}).length === 0) delete updatedErrors.items[index];
      setErrors(updatedErrors);
    }
  };

  // Hardware items handlers
  const handleHardwareItemChange = (index, field, value) => {
    const updatedItems = [...formData.hardwareItems];
    let validatedValue = value;

    if (field === 'quantity') {
      validatedValue = value.replace(/[^\d.]/g, '');
      const parts = validatedValue.split('.');
      if (parts.length > 2) validatedValue = parts[0] + '.' + parts.slice(1).join('');
      if (parts[1] && parts[1].length > 2) validatedValue = parts[0] + '.' + parts[1].slice(0, 2);
      if (validatedValue.startsWith('.')) validatedValue = '0' + validatedValue;
      updatedItems[index][field] = validatedValue;
    } else if (field === 'description') {
      if (value.length <= VALIDATION_RULES.DESCRIPTION.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'size') {
      if (value.length <= VALIDATION_RULES.SIZE.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'thickness') {
      if (value.length <= VALIDATION_RULES.THICKNESS.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'specification') {
      if (value.length <= VALIDATION_RULES.SPECIFICATION.maxLength) updatedItems[index][field] = value;
      else return;
    } else {
      updatedItems[index][field] = value;
    }

    setFormData(prev => ({ ...prev, hardwareItems: updatedItems }));

    if (errors.hardwareItems && errors.hardwareItems[index] && errors.hardwareItems[index][field]) {
      const updatedErrors = { ...errors };
      delete updatedErrors.hardwareItems[index][field];
      if (Object.keys(updatedErrors.hardwareItems[index] || {}).length === 0) delete updatedErrors.hardwareItems[index];
      setErrors(updatedErrors);
    }
  };

  // Image upload handlers
  const handleImageUpload = (index, file, type = 'material') => {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      showError(`You can only upload ${getAllowedFileTypesText()}!`);
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      showError('File must be smaller than 5MB!');
      return false;
    }

    if (type === 'material') {
      const updatedItems = [...formData.items];
      updatedItems[index].image = {
        uid: file.uid || `upload-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'done',
        originFileObj: file
      };
      setFormData(prev => ({ ...prev, items: updatedItems }));

      if (errors.items && errors.items[index] && errors.items[index].image) {
        const updatedErrors = { ...errors };
        delete updatedErrors.items[index].image;
        setErrors(updatedErrors);
      }
    } else {
      const updatedItems = [...formData.hardwareItems];
      updatedItems[index].image = {
        uid: file.uid || `upload-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'done',
        originFileObj: file
      };
      setFormData(prev => ({ ...prev, hardwareItems: updatedItems }));

      if (errors.hardwareItems && errors.hardwareItems[index] && errors.hardwareItems[index].image) {
        const updatedErrors = { ...errors };
        delete updatedErrors.hardwareItems[index].image;
        setErrors(updatedErrors);
      }
    }

    showSuccess(`${file.name} file added successfully`);
    return false;
  };

  const removeImage = (index, type = 'material') => {
    if (type === 'material') {
      const updatedItems = [...formData.items];
      updatedItems[index].image = null;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      const updatedItems = [...formData.hardwareItems];
      updatedItems[index].image = null;
      setFormData(prev => ({ ...prev, hardwareItems: updatedItems }));
    }
  };

  const createUploadProps = (index, type = 'material') => {
    const img = type === 'material' ? formData.items[index].image : formData.hardwareItems[index].image;

    return {
      name: 'file',
      multiple: false,
      beforeUpload: (file) => {
        handleImageUpload(index, file, type);
        return false;
      },
      onRemove: () => removeImage(index, type),
      fileList: img
        ? [{
          uid: img.uid || img.filename || `${index}`,
          name: img.name || img.originalName || img.filename || 'image',
          status: img.status || 'done',
          url: img.url || (img.path ? `http://localhost:5000${img.path}` : null)
        }]
        : []
    };
  };

  // Add/Remove items
  const addItem = (type = 'material') => {
    if (type === 'material') {
      const newSNo = formData.items.length + 1;
      setFormData(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            sNo: newSNo,
            description: '',
            area: '',
            code: '',
            specification: '',
            unitType: '',
            quantity: '',
            thickness: '',
            remark: '',
            image: null
          }
        ]
      }));
    } else {
      const newSNo = formData.hardwareItems.length + 1;
      setFormData(prev => ({
        ...prev,
        hardwareItems: [
          ...prev.hardwareItems,
          {
            sNo: newSNo,
            description: '',
            size: '',
            thickness: '',
            specification: '',
            quantity: '',
            image: null
          }
        ]
      }));
    }
  };

  const removeItem = (index, type = 'material') => {
    if (type === 'material') {
      const currentItems = [...formData.items];
      if (currentItems.length > 1) {
        currentItems.splice(index, 1);
        currentItems.forEach((item, idx) => { item.sNo = idx + 1; });
        setFormData(prev => ({ ...prev, items: currentItems }));

        if (errors.items && errors.items[index]) {
          const updatedErrors = { ...errors };
          updatedErrors.items.splice(index, 1);
          setErrors(updatedErrors);
        }
      } else {
        const resetRow = {
          sNo: 1,
          description: '',
          area: '',
          code: '',
          specification: '',
          unitType: '',
          quantity: '',
          thickness: '',
          remark: '',
          image: null
        };
        setFormData(prev => ({ ...prev, items: [resetRow] }));

        if (errors.items) {
          const updatedErrors = { ...errors };
          delete updatedErrors.items;
          setErrors(updatedErrors);
        }
      }
    } else {
      const currentItems = [...formData.hardwareItems];
      if (currentItems.length > 1) {
        currentItems.splice(index, 1);
        currentItems.forEach((item, idx) => { item.sNo = idx + 1; });
        setFormData(prev => ({ ...prev, hardwareItems: currentItems }));

        if (errors.hardwareItems && errors.hardwareItems[index]) {
          const updatedErrors = { ...errors };
          updatedErrors.hardwareItems.splice(index, 1);
          setErrors(updatedErrors);
        }
      } else {
        const resetRow = {
          sNo: 1,
          description: '',
          size: '',
          thickness: '',
          specification: '',
          quantity: '',
          image: null
        };
        setFormData(prev => ({ ...prev, hardwareItems: [resetRow] }));

        if (errors.hardwareItems) {
          const updatedErrors = { ...errors };
          delete updatedErrors.hardwareItems;
          setErrors(updatedErrors);
        }
      }
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';

    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    else if (new Date(formData.startDate) > new Date(formData.endDate)) newErrors.startDate = 'Start date must be before end date';

    if (!formData.endDate) newErrors.endDate = 'End date is required';

    const remarksError = formData.remarks && formData.remarks.length > VALIDATION_RULES.REMARKS.maxLength
      ? `Remarks cannot exceed ${VALIDATION_RULES.REMARKS.maxLength} characters`
      : '';
    if (remarksError) newErrors.remarks = remarksError;

    // Material items validation
    const itemErrors = [];
    let hasValidItems = false;

    formData.items.forEach((item, index) => {
      const itemError = {};

      const descriptionError = validateDescription(item.description);
      if (descriptionError) itemError.description = descriptionError;

      const areaError = validateArea(item.area);
      if (areaError) itemError.area = areaError;

      const codeError = validateCode(item.code);
      if (codeError) itemError.code = codeError;

      const quantityError = validateQuantity(item.quantity);
      if (quantityError) itemError.quantity = quantityError;

      const thicknessError = validateThickness(item.thickness);
      if (thicknessError) itemError.thickness = thicknessError;

      const itemRemarkError = validateItemRemark(item.remark);
      if (itemRemarkError) itemError.remark = itemRemarkError;

      if (Object.keys(itemError).length > 0) itemErrors[index] = itemError;
      else hasValidItems = true;
    });

    if (itemErrors.length > 0) newErrors.items = itemErrors;

    // Hardware items validation
    const hardwareItemErrors = [];
    let hasValidHardwareItems = false;

    formData.hardwareItems.forEach((item, index) => {
      const itemError = {};

      const descriptionError = validateDescription(item.description);
      if (descriptionError) itemError.description = descriptionError;

      const quantityError = validateQuantity(item.quantity);
      if (quantityError) itemError.quantity = quantityError;

      const sizeError = validateSize(item.size);
      if (sizeError) itemError.size = sizeError;

      const thicknessError = validateThickness(item.thickness);
      if (thicknessError) itemError.thickness = thicknessError;

      if (Object.keys(itemError).length > 0) hardwareItemErrors[index] = itemError;
      else hasValidHardwareItems = true;
    });

    if (hardwareItemErrors.length > 0) newErrors.hardwareItems = hardwareItemErrors;

    if (!hasValidItems && formData.items.length > 0) {
      newErrors.items = newErrors.items || {};
      newErrors.items.general = 'At least one valid material item is required';
    }

    if (!hasValidHardwareItems && formData.hardwareItems.length > 0) {
      newErrors.hardwareItems = newErrors.hardwareItems || {};
      newErrors.hardwareItems.general = 'At least one valid hardware item is required';
    }

    setErrors(newErrors);
    setShowValidation(true);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalQuantity = (type = 'material') => {
    if (type === 'material') {
      return formData.items.reduce((total, item) => total + (parseFloat(item.quantity) || 0), 0).toFixed(2);
    } else {
      return formData.hardwareItems.reduce((total, item) => total + (parseFloat(item.quantity) || 0), 0).toFixed(2);
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const submitData = new FormData();

      // Process material items
      const itemsForSubmit = formData.items.map((item, index) => {
        if (item.image && item.image.originFileObj) {
          submitData.append(`itemImage_${index}`, item.image.originFileObj);
          const { image, ...rest } = item;
          return rest;
        }
        else if (item.image && item.image.path) {
          return item;
        }
        const { image, ...rest } = item;
        return rest;
      });

      // Process hardware items
      const hardwareItemsForSubmit = formData.hardwareItems.map((item, index) => {
        if (item.image && item.image.originFileObj) {
          submitData.append(`hardwareItemImage_${index}`, item.image.originFileObj);
          const { image, ...rest } = item;
          return rest;
        }
        else if (item.image && item.image.path) {
          return item;
        }
        const { image, ...rest } = item;
        return rest;
      });

      // Append all form data
      submitData.append('items', JSON.stringify(itemsForSubmit));
      submitData.append('hardwareItems', JSON.stringify(hardwareItemsForSubmit));
      submitData.append('customerName', formData.customerName);
      submitData.append('projectName', formData.projectName);
      submitData.append('startDate', formData.startDate);
      submitData.append('endDate', formData.endDate);
      submitData.append('overallProduction', formData.overallProduction || '');
      submitData.append('remarks', formData.remarks || '');
      submitData.append('status', formData.status);

      if (purchaseRequest) {
        await purchaseRequestsAPI.update(purchaseRequest._id, submitData);
        showSuccess('Purchase request updated successfully');
      } else {
        await purchaseRequestsAPI.create(submitData);
        showSuccess('Purchase request created successfully');
      }

      onSubmit();
    } catch (error) {
      console.error('Error submitting purchase request:', error);
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.path) {
            const field = err.path;
            if (field.includes('items')) {
              const match = field.match(/items\[(\d+)\]\.(\w+)/);
              if (match) {
                const [, index, fieldName] = match;
                if (!backendErrors.items) backendErrors.items = [];
                if (!backendErrors.items[index]) backendErrors.items[index] = {};
                backendErrors.items[index][fieldName] = err.msg;
              }
            } else if (field.includes('hardwareItems')) {
              const match = field.match(/hardwareItems\[(\d+)\]\.(\w+)/);
              if (match) {
                const [, index, fieldName] = match;
                if (!backendErrors.hardwareItems) backendErrors.hardwareItems = [];
                if (!backendErrors.hardwareItems[index]) backendErrors.hardwareItems[index] = {};
                backendErrors.hardwareItems[index][fieldName] = err.msg;
              }
            } else {
              backendErrors[field] = err.msg;
            }
          }
        });
        setErrors(backendErrors);
      } else if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900">
            {purchaseRequest ? 'Edit Purchase Requisition' : 'Create Purchase Requisition'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput
            label="Customer name"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            type="select"
            options={[{ value: '', label: 'Select Customer' }, ...inhouseCustomers.map(c => ({ value: c.customerName, label: c.customerName }))]}
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
            options={[{ value: '', label: 'Select Project' }, ...filteredProjects.map(p => ({ value: p.projectName, label: p.projectName }))]}
            error={showValidation && errors.projectName}
            required
            size="medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <FloatingInput label="Project Start Date" name="milestoneStartDate" value={formData.milestoneStartDate} onChange={() => { }} type="date" readOnly size="small" className="bg-gray-50 cursor-not-allowed" />
          <FloatingInput label="Project End Date" name="milestoneEndDate" value={formData.milestoneEndDate} onChange={() => { }} type="date" readOnly size="small" className="bg-gray-50 cursor-not-allowed" />
          <FloatingInput label="Production Start Date" name="startDate" value={formData.startDate} onChange={handleChange} type="date" error={showValidation && errors.startDate} required size="small" />
          <FloatingInput label="Production End Date" name="endDate" value={formData.endDate} onChange={handleChange} type="date" error={showValidation && errors.endDate} required size="small" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'materials'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Materials
              <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {formData.items.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hardware')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'hardware'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Hardware
              <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {formData.hardwareItems.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {activeTab === 'materials' ? 'Add material items required for this request' : 'Add hardware items required for this request'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => addItem(activeTab === 'materials' ? 'material' : 'hardware')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" /> Add Row
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          {/* Table Container with Horizontal and Vertical Scroll */}
          <div className="flex-1 overflow-x-auto" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <div className="min-w-max">
              {/* Table Header based on active tab */}
              <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                {activeTab === 'materials' ? (
                  <div className="flex gap-2 px-4 py-3 items-center text-xs bg-gray-50" style={{ minWidth: '1600px' }}>
                    <div className="w-16 font-medium text-gray-700">S.No</div>
                    <div className="w-48 font-medium text-gray-700">Description*</div>
                    <div className="w-32 font-medium text-gray-700">Area*</div>
                    <div className="w-32 font-medium text-gray-700">Code*</div>
                    <div className="w-48 font-medium text-gray-700">Specification</div>
                    <div className="w-28 font-medium text-gray-700">Unit Type</div>
                    <div className="w-24 font-medium text-gray-700">Qty*</div>
                    <div className="w-32 font-medium text-gray-700">Thickness</div>
                    <div className="w-32 font-medium text-gray-700">Remark</div>
                    <div className="w-24 font-medium text-gray-700">Image</div>
                    <div className="w-20 font-medium text-gray-700 text-center">Action</div>
                  </div>
                ) : (
                  <div className="flex gap-2 px-4 py-3 items-center text-xs bg-gray-50" style={{ minWidth: '1400px' }}>
                    <div className="w-16 font-medium text-gray-700">S.No</div>
                    <div className="w-48 font-medium text-gray-700">Description*</div>
                    <div className="w-32 font-medium text-gray-700">Size</div>
                    <div className="w-32 font-medium text-gray-700">Thickness</div>
                    <div className="w-48 font-medium text-gray-700">Specification</div>
                    <div className="w-24 font-medium text-gray-700">Qty*</div>
                    <div className="w-24 font-medium text-gray-700">Image</div>
                    <div className="w-20 font-medium text-gray-700 text-center">Action</div>
                  </div>
                )}
              </div>

              {/* Table Body */}
              <div>
                {activeTab === 'materials' ? (
                  // Materials Items
                  formData.items.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">No material items added. Click "Add Row" to add items.</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex gap-2 px-4 py-3 items-start border-b border-gray-200" style={{ minWidth: '1600px' }}>
                          {/* S.No */}
                          <div className="w-16 flex items-center">
                            <div className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100">
                              <span className="text-xs font-medium text-gray-900">{item.sNo}</span>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="w-48">
                            <FloatingInput
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              type="text"
                              error={showValidation && errors.items?.[index]?.description}
                              size="small"
                              hideLabel
                              placeholder="Description"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Area */}
                          <div className="w-32">
                            <FloatingInput
                              value={item.area}
                              onChange={(e) => handleItemChange(index, 'area', e.target.value)}
                              type="text"
                              error={showValidation && errors.items?.[index]?.area}
                              size="small"
                              hideLabel
                              placeholder="Area"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Code */}
                          <div className="w-32">
                            <FloatingInput
                              value={item.code}
                              onChange={(e) => handleItemChange(index, 'code', e.target.value)}
                              type="text"
                              error={showValidation && errors.items?.[index]?.code}
                              size="small"
                              hideLabel
                              placeholder="Code"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Specification */}
                          <div className="w-48">
                            <FloatingInput
                              value={item.specification}
                              onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                              type="text"
                              error={showValidation && errors.items?.[index]?.specification}
                              size="small"
                              hideLabel
                              placeholder="Specification"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Unit Type */}
                          <div className="w-28">
                            <FloatingInput
                              value={item.unitType}
                              onChange={(e) => handleItemChange(index, 'unitType', e.target.value)}
                              type="text"
                              size="small"
                              hideLabel
                              placeholder="Unit"
                              className="w-full text-xs"
                              list={`unitType-${index}`}
                            />
                            <datalist id={`unitType-${index}`}>
                              <option value="PCS">PCS</option>
                              <option value="Meter">Meter</option>
                              <option value="SQM">SQM</option>
                              <option value="KG">KG</option>
                              <option value="Liter">Liter</option>
                              <option value="Roll">Roll</option>
                              <option value="Set">Set</option>
                              <option value="Box">Box</option>
                              <option value="Pack">Pack</option>
                            </datalist>
                          </div>

                          {/* Quantity */}
                          <div className="w-24">
                            <FloatingInput
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              type="text"
                              inputMode="decimal"
                              error={showValidation && errors.items?.[index]?.quantity}
                              size="small"
                              hideLabel
                              className="w-full text-xs"
                              placeholder="0"
                            />
                          </div>

                          {/* Thickness */}
                          <div className="w-32">
                            <FloatingInput
                              value={item.thickness}
                              onChange={(e) => handleItemChange(index, 'thickness', e.target.value)}
                              type="text"
                              error={showValidation && errors.items?.[index]?.thickness}
                              size="small"
                              hideLabel
                              className="w-full text-xs"
                              placeholder="Thickness"
                            />
                          </div>

                          {/* Item Remark */}
                          <div className="w-32">
                            <FloatingInput
                              value={item.remark}
                              onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
                              type="text"
                              error={showValidation && errors.items?.[index]?.remark}
                              size="small"
                              hideLabel
                              className="w-full text-xs"
                              placeholder="Remark"
                            />
                          </div>

                          {/* Image Upload */}
                          <div className="w-24">
                            {item.image ? (
                              <button
                                type="button"
                                onClick={() => setImagePreview(item.image)}
                                className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                title="Click to view"
                              >
                                👁️ View
                              </button>
                            ) : (
                              <Upload
                                {...createUploadProps(index, 'material')}
                                accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.pdf"
                              >
                                <Button
                                  icon={<UploadOutlined />}
                                  size="small"
                                  className="w-full text-xs"
                                  title={`Upload ${getAllowedFileTypesText()}, Max 5MB`}
                                >
                                  Upload
                                </Button>
                              </Upload>
                            )}
                            {errors.items?.[index]?.image && (
                              <div className="text-xs text-red-500 mt-1">{errors.items[index].image}</div>
                            )}
                          </div>

                          {/* Delete Button */}
                          <div className="w-20 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index, 'material')}
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-red-600 hover:bg-red-50"
                              title={formData.items.length > 1 ? 'Delete Row' : 'Clear Row'}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // Hardware Items
                  formData.hardwareItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">No hardware items added. Click "Add Row" to add items.</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {formData.hardwareItems.map((item, index) => (
                        <div key={index} className="flex gap-2 px-4 py-3 items-start border-b border-gray-200" style={{ minWidth: '1400px' }}>
                          {/* S.No */}
                          <div className="w-16 flex items-center">
                            <div className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100">
                              <span className="text-xs font-medium text-gray-900">{item.sNo}</span>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="w-48">
                            <FloatingInput
                              value={item.description}
                              onChange={(e) => handleHardwareItemChange(index, 'description', e.target.value)}
                              type="text"
                              error={showValidation && errors.hardwareItems?.[index]?.description}
                              size="small"
                              hideLabel
                              placeholder="Description"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Size */}
                          <div className="w-32">
                            <FloatingInput
                              value={item.size}
                              onChange={(e) => handleHardwareItemChange(index, 'size', e.target.value)}
                              type="text"
                              error={showValidation && errors.hardwareItems?.[index]?.size}
                              size="small"
                              hideLabel
                              placeholder="Size (e.g., 10x20mm)"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Thickness */}
                          <div className="w-32">
                            <FloatingInput
                              value={item.thickness}
                              onChange={(e) => handleHardwareItemChange(index, 'thickness', e.target.value)}
                              type="text"
                              error={showValidation && errors.hardwareItems?.[index]?.thickness}
                              size="small"
                              hideLabel
                              placeholder="Thickness"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Specification */}
                          <div className="w-48">
                            <FloatingInput
                              value={item.specification}
                              onChange={(e) => handleHardwareItemChange(index, 'specification', e.target.value)}
                              type="text"
                              error={showValidation && errors.hardwareItems?.[index]?.specification}
                              size="small"
                              hideLabel
                              placeholder="Specification"
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="w-24">
                            <FloatingInput
                              value={item.quantity}
                              onChange={(e) => handleHardwareItemChange(index, 'quantity', e.target.value)}
                              type="text"
                              inputMode="decimal"
                              error={showValidation && errors.hardwareItems?.[index]?.quantity}
                              size="small"
                              hideLabel
                              className="w-full text-xs"
                              placeholder="0"
                            />
                          </div>

                          {/* Image Upload */}
                          <div className="w-24">
                            {item.image ? (
                              <button
                                type="button"
                                onClick={() => setImagePreview(item.image)}
                                className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                title="Click to view"
                              >
                                👁️ View
                              </button>
                            ) : (
                              <Upload
                                {...createUploadProps(index, 'hardware')}
                                accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.pdf"
                              >
                                <Button
                                  icon={<UploadOutlined />}
                                  size="small"
                                  className="w-full text-xs"
                                  title={`Upload ${getAllowedFileTypesText()}, Max 5MB`}
                                >
                                  Upload
                                </Button>
                              </Upload>
                            )}
                            {errors.hardwareItems?.[index]?.image && (
                              <div className="text-xs text-red-500 mt-1">{errors.hardwareItems[index].image}</div>
                            )}
                          </div>

                          {/* Delete Button */}
                          <div className="w-20 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index, 'hardware')}
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-red-600 hover:bg-red-50"
                              title={formData.hardwareItems.length > 1 ? 'Delete Row' : 'Clear Row'}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Total Quantity Summary */}
        <div className="mt-4 flex justify-end">
          <div className="px-4 py-2 bg-blue-50 rounded-md">
            <span className="text-sm font-medium text-gray-700">
              Total {activeTab === 'materials' ? 'Material' : 'Hardware'} Quantity:
            </span>
            <span className="text-sm font-bold text-blue-700 ml-2">
              {calculateTotalQuantity(activeTab)}
            </span>
          </div>
        </div>

        {/* General Remarks */}
        <div className="mt-6 relative">
          <FloatingInput
            label="General Remarks (Optional)"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            type="textarea"
            error={errors.remarks}
            size="medium"
            rows={3}
            maxLength={VALIDATION_RULES.REMARKS.maxLength}
          />
          <div className="absolute right-2 top-2 text-xs text-gray-400">
            {formData.remarks.length}/{VALIDATION_RULES.REMARKS.maxLength}
          </div>
        </div>

        {purchaseRequest && (
          <div className="mt-6">
            <FloatingInput
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              type="select"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'completed', label: 'Completed' }
              ]}
              error={errors.status}
              size="medium"
            />
          </div>
        )}

        {/* Validation Errors */}
        {showValidation && activeTab === 'materials' && errors.items?.general && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-sm text-red-600">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              <span>{errors.items.general}</span>
            </div>
          </div>
        )}

        {showValidation && activeTab === 'hardware' && errors.hardwareItems?.general && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-sm text-red-600">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              <span>{errors.hardwareItems.general}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading || isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {purchaseRequest ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                {purchaseRequest ? 'Update Purchase Requisition' : 'Create Purchase Requisition'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Image Preview</h3>
              <button
                onClick={() => setImagePreview(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {imagePreview.type && imagePreview.type.startsWith('image/') ? (
                <img
                  src={
                    imagePreview.isExisting && imagePreview.url
                      ? imagePreview.url
                      : imagePreview.originFileObj
                      ? URL.createObjectURL(imagePreview.originFileObj)
                      : typeof imagePreview === 'string'
                      ? imagePreview
                      : ''
                  }
                  alt="Preview"
                  className="max-w-full h-auto max-h-[70vh] mx-auto"
                />
              ) : imagePreview.type === 'application/pdf' ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-600 text-center">
                    <strong>{imagePreview.name}</strong><br />
                    PDF file cannot be previewed directly.
                  </p>
                  {imagePreview.originFileObj ? (
                    <a
                      href={URL.createObjectURL(imagePreview.originFileObj)}
                      download={imagePreview.name}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Download PDF
                    </a>
                  ) : imagePreview.isExisting && imagePreview.url ? (
                    <a
                      href={imagePreview.url}
                      download={imagePreview.name}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Download PDF
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-600">File type not supported for preview</p>
                </div>
              )}
              <div className="mt-4 text-xs text-gray-500 border-t pt-4">
                <p><strong>File Name:</strong> {imagePreview.name}</p>
                <p><strong>File Size:</strong> {(imagePreview.size / 1024).toFixed(2)} KB</p>
                <p><strong>File Type:</strong> {imagePreview.type}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default PurchaseRequestForm;