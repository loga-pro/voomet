import React, { useState, useEffect, useCallback } from 'react';
import { partsAPI, boqAPI, projectsAPI, customersAPI, API_BASE_URL } from '../../services/api';
import FloatingInput from './FloatingInput';
import NotificationComponent from '../Notifications/Notification';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

// Helper function to get allowed file types in words
const getAllowedFileTypesText = () => {
  return "Images (JPEG, PNG, GIF, BMP, WebP, SVG, TIFF) and PDF files";
};

const BOQForm = ({ boq, onSubmit, onCancel, showNotification, showError, boqItems }) => {
  const [formData, setFormData] = useState({
    customer: '',
    projectName: '',
    scopeOfWork: [],
    items: [{
      partName: '',
      numberOfUnits: '',
      specification: '',
      unitType: '',
      unitPrice: '',
      margin: '0',
      totalPrice: '',
      remarks: '',
      uploadImg: '',
      image: null,
      isCustom: false
    }],
    finalTotalWithoutGST: '0',
    discountPercentage: '0',
    discountAmount: '0.00',
    totalAfterDiscount: '0.00',
    transportationCharges: '0',
    gstPercentage: '18',
    totalWithGST: '0',
    overallRemarks: '',
    paymentTerms: [{ discount: '', Installment: 1, dueDate: '' }],
  });
  const [selectedProject, setSelectedProject] = useState('');
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Function to capitalize first letter of each word
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Local notification helper
  const showLocalNotification = useCallback((message, type = 'success') => {
    setNotification({
      isVisible: true,
      message,
      type
    });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  }, []);

  // Fetch parts
  const fetchParts = useCallback(async () => {
    try {
      const response = await partsAPI.getAll();
      setParts(response.data || []);
      setFilteredParts(response.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
      showLocalNotification('Error fetching parts data', 'error');
    }
  }, [showLocalNotification]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Scope of work options with capitalized display
  const scopeOfWorkOptions = parts.length > 0
    ? [...new Set(parts.map(part => part.scopeOfWork))].filter(Boolean)
    : [];

  // Filter parts when scope changes
  useEffect(() => {
    if (formData.scopeOfWork && formData.scopeOfWork.length > 0) {
      const filtered = parts.filter(part =>
        formData.scopeOfWork.includes(part.scopeOfWork)
      );
      setFilteredParts(filtered);
    } else {
      setFilteredParts([]);
    }
  }, [formData.scopeOfWork, parts]);

  // Initialize form data for edit mode
  useEffect(() => {
    if (!boq) return;

    // Scope of work formatting
    const scopeOfWorkArray = Array.isArray(boq.scopeOfWork)
      ? boq.scopeOfWork
      : (boq.scopeOfWork || '').split(',').map(s => s.trim()).filter(Boolean);

    // Items formatting
    let formattedItems = Array.isArray(boq.items) ? boq.items : [];

    formattedItems = formattedItems.map(item => ({
      partName: item.partName || '',
      numberOfUnits: String(item.numberOfUnits || ''),
      specification: item.specification || '',
      unitType: item.unitType || '',
      unitPrice: String(item.unitPrice || ''),
      margin: String(item.margin || '0'),
      totalPrice: String(item.totalPrice || ''),
      remarks: item.remarks || '',
      isCustom: item.isCustom || false,
      image: item.image
        ? {
          ...item.image,
          name: item.image.originalName || item.image.filename, // FIX
          url: `${API_BASE_URL}${item.image.path}`,              // FULL URL FIX
          status: 'done'
        }
        : null

    }));

    if (formattedItems.length === 0) {
      formattedItems = [{
        partName: '',
        numberOfUnits: '',
        specification: '',
        unitType: '',
        unitPrice: '',
        margin: '0',
        totalPrice: '',
        remarks: '',
        image: null,
        isCustom: false
      }];
    }

    // Build final form state
    const finalFormData = {
      customer: boq.customer || '',
      projectName: boq.projectName || '',
      scopeOfWork: scopeOfWorkArray,
      items: formattedItems,

      // Correct discount fields
      discountPercentage: String(boq.discountPercentage || '0'),
      discountAmount: String(boq.discountAmount || '0'),
      totalAfterDiscount: String(Math.max(0, parseFloat(boq.finalTotalWithoutGST || 0) - parseFloat(boq.discountAmount || 0)).toFixed(2)),

      finalTotalWithoutGST: String(boq.finalTotalWithoutGST || '0'),
      transportationCharges: String(boq.transportationCharges || '0'),
      gstPercentage: String(boq.gstPercentage || '18'),
      totalWithGST: String(boq.totalWithGST || '0'),
      overallRemarks: boq.overallRemarks || '',
      paymentTerms: boq.paymentTerms && boq.paymentTerms.length > 0
        ? boq.paymentTerms.map(term => ({
          discount: String(term.discount || ''),
          Installment: term.Installment || 1
        }))
        : [{ discount: '', Installment: 1 }]
    };

    console.log('BOQForm: Setting formData with projectName =', finalFormData.projectName);
    setFormData(finalFormData);
    setIsInitialLoad(false);
  }, [boq]);

  // Fetch projects when boq is loaded in edit mode
  useEffect(() => {
    const fetchProjectsForEdit = async () => {
      if (boq && boq.customer) {
        try {
          const response = await projectsAPI.getAll({ customerName: boq.customer });
          let projectsData = response.data || response;

          // Filter projects by stage (exclude RFQ), but always include the current project
          const allowedStages = ['boq', 'awarded', 'under_execution', 'completed', 'post_implementation'];
          projectsData = (projectsData || []).filter(project =>
            allowedStages.includes(project.stage) || project.projectName === boq.projectName
          );

          setProjects(projectsData || []);
        } catch (error) {
          console.error('Error fetching projects for edit:', error);
          setProjects([]);
        }
      }
    };

    fetchProjectsForEdit();
  }, [boq]);

  // Fetch customers on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await customersAPI.getAll();
        const customersData = response.data || response;
        setCustomers(customersData);
      } catch (error) {
        console.error('Error fetching customers:', error);
        showLocalNotification('Error fetching customers', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch projects when customer is selected
  useEffect(() => {
    const fetchProjects = async () => {
      if (formData.customer) {
        try {
          setLoading(true);
          const response = await projectsAPI.getAll({ customerName: formData.customer });
          let projectsData = response.data || response;

          // Filter projects by stage (exclude RFQ), but always include the current project if editing
          const allowedStages = ['boq', 'awarded', 'under_execution', 'completed', 'post_implementation'];
          projectsData = (projectsData || []).filter(project =>
            allowedStages.includes(project.stage) || (boq && project.projectName === boq.projectName)
          );

          setProjects(projectsData || []);

          // If there's only one project, auto-populate the project name
          if (projectsData && projectsData.length === 1 && !formData.projectName) {
            setFormData(prev => ({
              ...prev,
              projectName: projectsData[0].projectName
            }));
          }
        } catch (error) {
          console.error('Error fetching projects:', error);
          showLocalNotification('Error fetching projects', 'error');
          setProjects([]);
        } finally {
          setLoading(false);
        }
      } else {
        setProjects([]);
        // Clear project name when customer is cleared
        setFormData(prev => ({
          ...prev,
          projectName: ''
        }));
      }
    };

    fetchProjects();
  }, [formData.customer]);

  // Calculate totals helper
  const calculateBoqMetrics = (data) => {
    const updatedItems = data.items.map(item => {
      const numberOfUnits = parseFloat(item.numberOfUnits || 0);
      const unitPrice = parseFloat(item.unitPrice || 0);
      const margin = parseFloat(item.margin || 0);

      // Apply margin as markup/increase: increased price = unitPrice + (unitPrice * margin%)
      const increasedUnitPrice = unitPrice + (unitPrice * (margin / 100));
      const totalPrice = numberOfUnits * increasedUnitPrice;

      return {
        ...item,
        totalPrice: isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2)
      };
    });

    // Calculate items total only (no transportation in subtotal)
    const itemsTotal = updatedItems.reduce((sum, item) => {
      return sum + (parseFloat(item.totalPrice || 0));
    }, 0);

    // Final total without GST is now the fixed Gross Total
    const finalTotalWithoutGST = itemsTotal;

    // Apply discount
    let discountPercentage = parseFloat(data.discountPercentage || 0);
    if (isNaN(discountPercentage) || discountPercentage < 0) discountPercentage = 0;
    if (discountPercentage > 100) discountPercentage = 100;

    const discountAmount = itemsTotal * (discountPercentage / 100);

    // Calculate Taxable Value (Items - Discount + Transportation)
    const netItemsTotal = Math.max(0, itemsTotal - discountAmount);
    const transportationCharges = parseFloat(data.transportationCharges || 0);

    // Transportation included in GST calculation basis
    const taxableValue = netItemsTotal + transportationCharges;

    // Calculate GST on Taxable Value
    const gstPercentage = parseFloat(data.gstPercentage || 0);
    const gstAmount = taxableValue * (gstPercentage / 100);

    // Total with GST
    const totalWithGST = taxableValue + gstAmount;

    return {
      items: updatedItems,
      discountAmount: isNaN(discountAmount) ? '0.00' : discountAmount.toFixed(2),
      totalAfterDiscount: isNaN(netItemsTotal) ? '0.00' : netItemsTotal.toFixed(2),
      finalTotalWithoutGST: isNaN(finalTotalWithoutGST) ? '0.00' : finalTotalWithoutGST.toFixed(2),
      totalWithGST: isNaN(totalWithGST) ? '0.00' : totalWithGST.toFixed(2)
    };
  };

  // Initial calculation
  useEffect(() => {
    if (!isInitialLoad && formData.items && formData.items.length > 0) {
      setFormData(prev => {
        const calculated = calculateBoqMetrics(prev);
        return {
          ...prev,
          items: calculated.items,
          discountAmount: calculated.discountAmount,
          totalAfterDiscount: calculated.totalAfterDiscount,
          finalTotalWithoutGST: calculated.finalTotalWithoutGST,
          totalWithGST: calculated.totalWithGST
        };
      });
    }
  }, [isInitialLoad]);

  const validateDiscount = (value) => {
    if (value === '') return '';

    const discountPercentage = parseFloat(value);
    if (isNaN(discountPercentage)) return 'Enter a valid number';
    if (discountPercentage < 0) return 'Discount cannot be less than 0%';
    if (discountPercentage > 100) return 'Discount cannot be more than 100%';
    return '';
  };

  // Basic field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newData = { ...formData, [name]: value };

    if (name === 'discountPercentage') {
      if (value === '' || /^\d{0,3}(\.\d{0,2})?$/.test(value)) {
        const calculated = calculateBoqMetrics(newData);
        setFormData({ ...newData, ...calculated });

        // Validate in real-time
        const error = validateDiscount(value);
        setErrors(prev => ({ ...prev, [name]: error }));
      }
      return;
    }

    if (name === 'transportationCharges') {
      if (value === '' || /^\d{0,8}(\.\d{0,2})?$/.test(value)) {
        const calculated = calculateBoqMetrics(newData);
        setFormData({ ...newData, ...calculated });
        if (errors[name]) {
          setErrors(prev => ({ ...prev, [name]: '' }));
        }
      }
      return;
    }

    if (name === 'gstPercentage') {
      // Allow empty string or numbers 1-100 with up to 2 decimal places
      if (value === '' || /^\d{0,3}(\.\d{0,2})?$/.test(value)) {
        const numValue = parseFloat(value);

        // Validate range: must be between 1 and 100
        if (value !== '' && (isNaN(numValue) || numValue < 1 || numValue > 100)) {
          setErrors(prev => ({ ...prev, gstPercentage: 'GST percentage must be between 1 and 100' }));
          return;
        }

        const calculated = calculateBoqMetrics(newData);
        setFormData({ ...newData, ...calculated });

        // Clear error if valid
        if (errors.gstPercentage) {
          setErrors(prev => ({ ...prev, gstPercentage: '' }));
        }
      }
      return;
    }

    // When customer changes, clear project name
    if (name === 'customer') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        projectName: '' // Clear project when customer changes
      }));
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '', projectName: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleScopeOfWorkChange = (scope) => {
    setFormData(prev => {
      const currentScopes = Array.isArray(prev.scopeOfWork) ? [...prev.scopeOfWork] : [];
      const scopeIndex = currentScopes.indexOf(scope);

      if (scopeIndex > -1) {
        currentScopes.splice(scopeIndex, 1);
      } else {
        currentScopes.push(scope);
      }

      // Filter parts based on new scopes
      const newFilteredParts = currentScopes.length > 0
        ? parts.filter(part => currentScopes.includes(part.scopeOfWork))
        : [];

      // Clear items that don't match the new scope selection
      const updatedItems = prev.items.map(item => {
        // If no scopes selected or item's part doesn't match any selected scope
        const itemPart = newFilteredParts.find(p => p.partName === item.partName);
        if (!itemPart) {
          return {
            ...item,
            partName: '',
            unitType: '',
            unitPrice: ''
          };
        }
        return item;
      });

      return {
        ...prev,
        scopeOfWork: currentScopes,
        items: updatedItems
      };
    });
  };

  // Item-specific change handler
  const handleItemChange = (index, field, value) => {
    if (field === 'unitPrice') {
      if (value !== '' && !/^\d{0,8}(\.\d{0,2})?$/.test(value)) {
        return;
      }
    }
    if (field === 'numberOfUnits') {
      if (value !== '' && !/^\d{0,8}$/.test(value)) {
        return;
      }
    }
    if (field === 'margin') {
      // Allow empty string or numbers 0-100 with up to 2 decimal places
      if (value !== '' && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) {
        return;
      }
      const numValue = parseFloat(value);
      if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
        return;
      }
    }

    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    const newData = { ...formData, items: updatedItems };
    const calculated = calculateBoqMetrics(newData);

    setFormData({ ...newData, ...calculated });
  };

  // When a part is selected or custom input is used
  const handlePartSelect = (index, partName, isCustomInput = false) => {
    const selectedPart = filteredParts.find(part => part.partName === partName);
    let updatedItems = [...formData.items];

    if (selectedPart && !isCustomInput) {
      // Selected from dropdown
      updatedItems[index] = {
        ...updatedItems[index],
        partName: selectedPart.partName,
        unitType: selectedPart.unitType || '',
        unitPrice: String(selectedPart.partPrice ?? ''),
        isCustom: false
      };
    } else {
      // Custom input or manual entry
      updatedItems[index] = {
        ...updatedItems[index],
        partName,
        isCustom: true
      };
    }

    const newData = { ...formData, items: updatedItems };
    const calculated = calculateBoqMetrics(newData);
    setFormData({ ...newData, ...calculated });
  };

  // File input handler
  const handleItemFileChange = (index, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showLocalNotification(`File size must be less than 5MB. Allowed: ${getAllowedFileTypesText()}`, 'error');
      return;
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      showLocalNotification(`Only ${getAllowedFileTypesText()} are allowed`, 'error');
      return;
    }
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], image: file };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'discountPercentage' && value === '') {
      const newData = { ...formData, [name]: '0' };
      const calculated = calculateBoqMetrics(newData);
      setFormData({ ...newData, ...calculated });
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handlePaymentTermBlur = (index, value) => {
    if (value === '') {
      setFormData(prev => {
        const newTerms = [...prev.paymentTerms];
        newTerms[index] = { ...newTerms[index], discount: '0' };
        return { ...prev, paymentTerms: newTerms };
      });
    }
  };


  const handleFileUpload = (index, file) => {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      showLocalNotification(
        `You can only upload ${getAllowedFileTypesText()}!`,
        "error"
      );
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      showLocalNotification(
        'File must be smaller than 5MB!',
        "error"
      );
      return false;
    }

    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        image: file,
        uploadImg: file.name
      };
      return { ...prev, items: updatedItems };
    });
    showLocalNotification(
      `${file.name} file added successfully`,
      "success"
    );
  };

  const handleRemoveFile = (index) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        image: null,
        uploadImg: ''
      };
      return { ...prev, items: updatedItems };
    });
  };

  const createUploadProps = (index) => {
    const img = formData.items[index].image;

    return {
      name: 'file',
      multiple: false,
      beforeUpload: (file) => {
        handleFileUpload(index, file);
        return false;
      },
      onRemove: () => handleRemoveFile(index),

      fileList: img
        ? [{
          uid: img.uid || `${index}`,
          name: img.name,
          status: img.status || 'done',
          url: img.url   // this allows preview
        }]
        : []
    };
  };


  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          partName: '',
          numberOfUnits: '',
          specification: '',
          unitType: '',
          unitPrice: '',
          margin: '0',
          totalPrice: '',
          remarks: '',
          uploadImg: '',
          image: null,
          isCustom: false  // Items from parts master
        }
      ]
    }));
  };

  const addCustomItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          partName: '',
          numberOfUnits: '',
          specification: '',
          unitType: '',
          unitPrice: '',
          margin: '0',
          totalPrice: '',
          remarks: '',
          uploadImg: '',
          image: null,
          isCustom: true  // Custom items with text input
        }
      ]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items];
      updatedItems.splice(index, 1);
      const newData = { ...formData, items: updatedItems };
      const calculated = calculateBoqMetrics(newData);
      setFormData({ ...newData, ...calculated });
    }
  };

  // Handlers for "Others" section
  const handleOtherItemChange = (index, field, value) => {
    if (field === 'unitPrice') {
      if (value !== '' && !/^\d{0,8}(\.\d{0,2})?$/.test(value)) {
        return;
      }
    }
    if (field === 'numberOfUnits') {
      if (value !== '' && !/^\d{0,8}$/.test(value)) {
        return;
      }
    }
    if (field === 'margin') {
      if (value !== '' && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) {
        return;
      }
      const numValue = parseFloat(value);
      if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
        return;
      }
    }

    const updatedOthers = [...formData.others];
    updatedOthers[index] = { ...updatedOthers[index], [field]: value };

    const newData = { ...formData, others: updatedOthers };
    const calculated = calculateBoqMetrics(newData);

    setFormData({ ...newData, ...calculated });
  };

  const handleOtherFileChange = (index, file) => {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      showLocalNotification(
        `You can only upload ${getAllowedFileTypesText()}!`,
        "error"
      );
      return false;
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      showLocalNotification(
        'File must be smaller than 5MB!',
        "error"
      );
      return false;
    }

    setFormData(prev => {
      const updatedOthers = [...prev.others];
      updatedOthers[index] = {
        ...updatedOthers[index],
        image: file,
        uploadImg: file.name
      };
      return { ...prev, others: updatedOthers };
    });
    showLocalNotification(
      `${file.name} file added successfully`,
      "success"
    );
  };

  const handleRemoveOtherFile = (index) => {
    setFormData(prev => {
      const updatedOthers = [...prev.others];
      updatedOthers[index] = {
        ...updatedOthers[index],
        image: null,
        uploadImg: ''
      };
      return { ...prev, others: updatedOthers };
    });
  };

  const createOtherUploadProps = (index) => {
    const img = formData.others[index].image;

    return {
      name: 'file',
      multiple: false,
      beforeUpload: (file) => {
        handleOtherFileChange(index, file);
        return false;
      },
      onRemove: () => handleRemoveOtherFile(index),

      fileList: img
        ? [{
          uid: img.uid || `other_${index}`,
          name: img.name,
          status: img.status || 'done',
          url: img.url
        }]
        : []
    };
  };

  const addOtherRow = () => {
    setFormData(prev => ({
      ...prev,
      others: [
        ...prev.others,
        {
          partName: '',
          numberOfUnits: '',
          specification: '',
          unitType: '',
          unitPrice: '',
          margin: '0',
          totalPrice: '',
          remarks: '',
          uploadImg: '',
          image: null
        }
      ]
    }));
  };

  const removeOtherRow = (index) => {
    if (formData.others.length > 1) {
      const updatedOthers = [...formData.others];
      updatedOthers.splice(index, 1);
      const newData = { ...formData, others: updatedOthers };
      const calculated = calculateBoqMetrics(newData);
      setFormData({ ...newData, ...calculated });
    }
  };



  const addPaymentTerm = () => {
    // Check if total percentage is already 100%
    const currentTotal = formData.paymentTerms.reduce((sum, term) => sum + (parseFloat(term.discount) || 0), 0);
    if (currentTotal >= 100) {
      showLocalNotification('Total payment percentage cannot exceed 100%', 'error');
      return;
    }

    if (formData.paymentTerms.length < 5) {
      setFormData(prev => ({
        ...prev,
        paymentTerms: [...prev.paymentTerms, { discount: '', Installment: prev.paymentTerms.length + 1 }]
      }));
    }
  };

  const removePaymentTerm = (index) => {
    // If updating existing BOQ, prevent removing original terms
    if (boq && boq.paymentTerms && index < boq.paymentTerms.length) {
      showLocalNotification('Cannot remove original payment terms', 'error');
      return;
    }

    if (formData.paymentTerms.length > 1) {
      setFormData(prev => {
        const newTerms = [...prev.paymentTerms];
        newTerms.splice(index, 1);
        // Re-index Installments
        const reindexedTerms = newTerms.map((term, idx) => ({ ...term, Installment: idx + 1 }));
        return { ...prev, paymentTerms: reindexedTerms };
      });
    }
  };

  const handlePaymentTermChange = (index, value) => {
    // If updating existing BOQ, prevent editing original terms
    if (boq && boq.paymentTerms && index < boq.paymentTerms.length) {
      return;
    }

    // Allows empty string, or positive numbers with up to 2 decimal places
    if (value !== '' && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) return;

    if (value !== '') {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

      // Check if new total exceeds 100%
      const otherTermsTotal = formData.paymentTerms.reduce((sum, term, idx) => {
        return idx !== index ? sum + (parseFloat(term.discount) || 0) : sum;
      }, 0);

      if (otherTermsTotal + numValue > 100) {
        showLocalNotification('Total payment percentage cannot exceed 100%', 'error');
        return;
      }
    }

    setFormData(prev => {
      const newTerms = [...prev.paymentTerms];
      newTerms[index] = { ...newTerms[index], discount: value };
      return { ...prev, paymentTerms: newTerms };
    });
  };
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.scopeOfWork || formData.scopeOfWork.length === 0) newErrors.scopeOfWork = 'At least one scope of work is required';
    if (formData.discount) {
      const discount = parseFloat(formData.discount);
      const finalTotal = parseFloat(formData.finalTotalWithoutGST);

      if (discount > finalTotal) {
        newErrors.discount = 'Discount cannot be greater than total amount';
      }
    }

    if (formData.transportationCharges) {
      const transportValue = parseFloat(formData.transportationCharges);
      if (isNaN(transportValue) || transportValue < 0) {
        newErrors.transportationCharges = 'Transportation charges must be a positive number';
      } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(formData.transportationCharges)) {
        newErrors.transportationCharges = 'Maximum 8 digits and 2 decimal places allowed';
      }
    }

    if (formData.items && Array.isArray(formData.items)) {
      formData.items.forEach((item, index) => {
        if (!item.partName) newErrors[`item-${index}-partName`] = 'Item name is required';
        if (!item.numberOfUnits || Number(item.numberOfUnits) <= 0) newErrors[`item-${index}-numberOfUnits`] = 'Valid number of units is required';
        if (item.numberOfUnits && !/^\d{1,8}$/.test(item.numberOfUnits)) {
          newErrors[`item-${index}-numberOfUnits`] = 'Maximum 8 digits allowed';
        }
        if (!item.unitPrice || Number(item.unitPrice) <= 0) newErrors[`item-${index}-unitPrice`] = 'Valid unit price is required';
        if (item.unitPrice && !/^\d{1,8}(\.\d{1,2})?$/.test(item.unitPrice)) {
          newErrors[`item-${index}-unitPrice`] = 'Maximum 8 digits and 2 decimal places allowed';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!boq && selectedProject && selectedProject !== "") {
      if (
        formData.customer === selectedProject.customer &&
        formData.projectName === selectedProject.projectName
      ) {
        showLocalNotification(
          "Modify the (Customer, Project Name) reference BOQ to create a new unique one",
          "error"
        );
        return;
      }
    }

    if (!validateForm()) {
      showLocalNotification('Please fix validation errors', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();

      const itemsForSubmit = (formData.items || []).map((item, index) => {
        if (item.image && item.image instanceof File) {
          submitData.append(`itemImage_${index}`, item.image);
          const { image, ...rest } = item;
          return rest;
        }

        return item;
      });

      submitData.append('items', JSON.stringify(itemsForSubmit));
      submitData.append('customer', formData.customer);
      submitData.append('projectName', formData.projectName);
      submitData.append('scopeOfWork', (formData.scopeOfWork || []).join(','));
      submitData.append('finalTotalWithoutGST', formData.finalTotalWithoutGST);
      submitData.append('transportationCharges', formData.transportationCharges);
      submitData.append('gstPercentage', formData.gstPercentage);
      submitData.append('totalWithGST', formData.totalWithGST);
      submitData.append('overallRemarks', formData.overallRemarks);
      submitData.append('paymentTerms', JSON.stringify(formData.paymentTerms));
      submitData.append('discountPercentage', formData.discountPercentage);
      submitData.append('discountAmount', formData.discountAmount);

      if (boq && boq._id) {
        await boqAPI.update(boq._id, submitData);
        if (showNotification) showNotification('BOQ updated successfully!');
      } else {
        await boqAPI.create(submitData);
        if (showNotification) showNotification('BOQ created successfully!');
      }

      if (onSubmit) onSubmit();
    } catch (error) {
      console.error('Error submitting BOQ:', error);

      // Handle duplicate BOQ error (409 Conflict)
      if (error.response?.status === 409) {
        const duplicateMessage = `A BOQ already exists for "${formData.customer}" and project "${formData.projectName}". Please use a different customer or project name combination.`;
        setErrors(prev => ({
          ...prev,
          submit: duplicateMessage,
          customer: 'Duplicate combination',
          projectName: 'Duplicate combination'
        }));
        if (showError) {
          showError(duplicateMessage);
        } else {
          showLocalNotification(duplicateMessage, 'error');
        }
        return;
      }

      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors(prev => ({ ...prev, submit: errorMessage }));
      if (showError) {
        showError(errorMessage);
      } else {
        showLocalNotification(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (e) => {
    if (e.target.value === "") {
      handleProjectClear();
      return
    }

    const project = JSON.parse(e.target.value);
    setSelectedProject(project);
    const scopeOfWorkArray = Array.isArray(project.scopeOfWork)
      ? project.scopeOfWork
      : (project.scopeOfWork || '').split(',').map(s => s.trim()).filter(Boolean);

    let formattedItems = Array.isArray(project.items) ? project.items : [];
    formattedItems = formattedItems.map(item => ({
      partName: item.partName || '',
      numberOfUnits: String(item.numberOfUnits || ''),
      specification: item.specification || '',
      unitType: item.unitType || '',
      unitPrice: String(item.unitPrice || ''),
      margin: String(item.margin || '0'),
      totalPrice: String(item.totalPrice || ''),
      remarks: item.remarks || '',
      isCustom: item.isCustom || false,
      image: item.image
        ? {
          ...item.image,
          name: item.image.originalName || item.image.filename,
          url: `${API_BASE_URL}${item.image.path}`,
          status: 'done'
        }
        : null

    }));

    if (formattedItems.length === 0) {
      formattedItems = [{
        partName: '',
        numberOfUnits: '',
        specification: '',
        unitType: '',
        unitPrice: '',
        margin: '0',
        totalPrice: '',
        remarks: '',
        image: null,
        isCustom: false
      }];
    }

    let formattedOthers = Array.isArray(project.others) ? project.others : [];
    formattedOthers = formattedOthers.map(item => ({
      partName: item.partName || '',
      numberOfUnits: String(item.numberOfUnits || ''),
      specification: item.specification || '',
      unitType: item.unitType || '',
      unitPrice: String(item.unitPrice || ''),
      margin: String(item.margin || '0'),
      totalPrice: String(item.totalPrice || ''),
      remarks: item.remarks || '',
      image: item.image
        ? {
          ...item.image,
          name: item.image.originalName || item.image.filename,
          url: `${API_BASE_URL}${item.image.path}`,
          status: 'done'
        }
        : null
    }));

    if (formattedOthers.length === 0) {
      formattedOthers = [{
        partName: '',
        numberOfUnits: '',
        specification: '',
        unitType: '',
        unitPrice: '',
        margin: '0',
        totalPrice: '',
        remarks: '',
        image: null
      }];
    }

    const finalFormData = {
      customer: project.customer || '',
      projectName: project.projectName || '',
      scopeOfWork: scopeOfWorkArray,
      items: formattedItems,
      others: formattedOthers,

      discountPercentage: String(project.discountPercentage || '0'),
      discountAmount: String(project.discountAmount || '0'),
      totalAfterDiscount: String(Math.max(0, parseFloat(project.finalTotalWithoutGST || 0) - parseFloat(project.discountAmount || 0)).toFixed(2)),

      finalTotalWithoutGST: String(project.finalTotalWithoutGST || '0'),
      transportationCharges: String(project.transportationCharges || '0'),
      gstPercentage: String(project.gstPercentage || '18'),
      totalWithGST: String(project.totalWithGST || '0'),
      overallRemarks: project.overallRemarks || '',
      paymentTerms: project.paymentTerms && project.paymentTerms.length > 0
        ? project.paymentTerms.map(term => ({
          discount: String(term.discount || ''),
          Installment: term.Installment || 1
        }))
        : [{ discount: '', Installment: 1 }]
    };

    setFormData(finalFormData);
  };

  const handleProjectClear = () => {
    setSelectedProject({});

    setFormData({
      customer: '',
      projectName: '',
      scopeOfWork: [],
      items: [
        {
          partName: '',
          numberOfUnits: '',
          specification: '',
          unitType: '',
          unitPrice: '',
          margin: '0',
          totalPrice: '',
          remarks: '',
          uploadImg: '',
          image: null,
          isCustom: false
        },
      ],
      finalTotalWithoutGST: '0',
      discountPercentage: '0',
      discountAmount: '0.00',
      totalAfterDiscount: '0.00',
      transportationCharges: '0',
      gstPercentage: '18',
      totalWithGST: '0',
      overallRemarks: '',
      paymentTerms: [{ discount: '', Installment: 1 }],
      selectedProject: '',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h3>

            {!boq && (
              <div className="grid grid-cols-1 md:grid-cols-2 relative">
                <FloatingInput
                  label="Selected Project"
                  name="selectedProject"
                  type="select"
                  onChange={handleProjectSelect}
                  value={
                    Object.keys(selectedProject).length > 0
                      ? JSON.stringify(selectedProject)
                      : ""
                  }
                  options={[
                    { value: "", label: "Select Project" },
                    ...boqItems.map((project) => ({
                      value: JSON.stringify(project),
                      label: `${project.customer} - ${project.projectName}`,
                    })),
                  ]}
                />


                {Object.keys(selectedProject).length > 0 && (
                  <button
                    className="absolute right-3 top-3 text-red-600 hover:text-red-800"
                    onClick={handleProjectClear}    // <-- Using function
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              {boq ? (
                <FloatingInput
                  label="Client Name"
                  name="customer"
                  value={formData.customer}
                  readOnly
                  error={errors.customer}
                  required
                />
              ) : (
                <FloatingInput
                  label="Customer"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  error={errors.customer}
                  type="select"
                  options={[{ value: '', label: 'Select Customer' }, ...customers.map(customer => ({ value: customer.customerName, label: customer.customerName }))]}
                  required
                />
              )}

              {/* Project Name */}
              <FloatingInput
                label="Project Name"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                error={errors.projectName}
                type="select"
                options={[
                  { value: '', label: 'Select Project' },
                  ...projects.map(project => ({
                    value: project.projectName,
                    label: project.projectName
                  }))
                ]}
                required
                disabled={!formData.customer || projects.length === 0}
              />

              {/* Scope of Work */}
              <div className="relative">
                <div className="max-h-32 overflow-y-auto p-3 border border-gray-300 rounded-md bg-white hover:border-gray-400 focus-within:border-blue-500 transition-colors duration-200">
                  <div className="flex flex-wrap gap-3">
                    {scopeOfWorkOptions.map(scope => (
                      <div key={scope} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`scope-${scope}`}
                          checked={formData.scopeOfWork.includes(scope)}
                          onChange={() => handleScopeOfWorkChange(scope)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`scope-${scope}`} className="ml-2 block text-sm text-gray-700">
                          {capitalizeWords(scope)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Label for Scope of Work */}
                <label className="absolute -top-2 left-2 text-xs text-blue-600 font-medium bg-white px-1 transition-all duration-200">
                  Scope of Work <span className="text-red-500">*</span>
                </label>

                {errors.scopeOfWork && (
                  <div className="mt-1 flex items-start">
                    <svg className="w-4 h-4 mt-0.5 mr-1 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-red-600">{errors.scopeOfWork}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Items
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  + Add Item
                </button>
                <button
                  type="button"
                  onClick={addCustomItemRow}
                  className="px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  + Add Other
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
              {formData.items.map((item, index) => (
                <div key={index} className="bg-white rounded-lg border p-4">
                  <div className="flex justify-end items-center mb-3">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>

                  {/* First Row - Main Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {/* Item Name - Dropdown for first item or if not custom, Text input for custom items */}
                    {item.isCustom ? (
                      <FloatingInput
                        label="Item Name"
                        value={item.partName}
                        onChange={(e) => handlePartSelect(index, e.target.value, true)}
                        error={errors[`item-${index}-partName`]}
                        type="text"
                        required
                      />
                    ) : (
                      <FloatingInput
                        label="Item Name"
                        value={item.partName}
                        onChange={(e) => handlePartSelect(index, e.target.value)}
                        error={errors[`item-${index}-partName`]}
                        type="select"
                        options={
                          formData.scopeOfWork && formData.scopeOfWork.length > 0
                            ? [{ value: '', label: 'Select Part' }, ...filteredParts.map(part => ({
                              value: part.partName,
                              label: `${part.partName}`
                            }))]
                            : [{ value: '', label: 'Select Scope of Work first' }]
                        }
                        disabled={!formData.scopeOfWork || formData.scopeOfWork.length === 0}
                        required
                      />
                    )}

                    <FloatingInput
                      label="No of Quantity"
                      value={item.numberOfUnits}
                      onChange={(e) => handleItemChange(index, 'numberOfUnits', e.target.value)}
                      error={errors[`item-${index}-numberOfUnits`]}
                      type="number"
                      step="1"
                      min="0"
                      required
                    />

                    <FloatingInput
                      label="Specification"
                      value={item.specification}
                      onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                      type="text"
                    />

                    <FloatingInput
                      label="Unit Type"
                      value={item.unitType}
                      onChange={(e) => handleItemChange(index, 'unitType', e.target.value)}
                      type="text"
                      readOnly={!item.isCustom}
                    />

                    <FloatingInput
                      label="Base Price (₹)"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      error={errors[`item-${index}-unitPrice`]}
                      type="number"
                      step="0.01"
                      min="0"
                      readOnly={!item.isCustom}
                      required
                    />

                    <FloatingInput
                      label="Margin (%)"
                      value={item.margin}
                      onChange={(e) => handleItemChange(index, 'margin', e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0-100%"
                    />

                    <FloatingInput
                      label="Total Price (₹)"
                      value={item.totalPrice}
                      readOnly
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Second Row - Remarks and Upload Field */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-4">
                    <div className="md:col-span-5">
                      <FloatingInput
                        label="Remarks"
                        value={item?.remarks}
                        onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                        type="text"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Upload
                        {...createUploadProps(index)}
                        accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.pdf"
                      >
                        <Button
                          icon={<UploadOutlined />}
                          className="w-full"
                          title={`Upload ${getAllowedFileTypesText()}, Max 5MB`}
                        >
                          {item.image ? item.image.name : 'Click to Upload File'}
                        </Button>
                      </Upload>

                      <p className="mt-1 text-xs text-gray-500">
                        Allowed: {getAllowedFileTypesText()}, Max size: 5MB
                      </p>

                      {item.image && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>File: {item.image.name}</p>
                          <p>Size: {(item.image.size / 1024).toFixed(2)} KB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Financial Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <FloatingInput
                label="Final Total without GST (₹)"
                name="finalTotalWithoutGST"
                value={formData.finalTotalWithoutGST}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                readOnly
              />

              <FloatingInput
                label="Discount %"
                name="discountPercentage"
                value={formData.discountPercentage}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0-100%"
                error={errors.discountPercentage}
                onBlur={handleBlur}
              />

              <FloatingInput
                label="Discount Amount (₹)"
                name="discountAmount"
                value={formData.discountAmount}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                readOnly
                className="bg-gray-100"
              />

              <FloatingInput
                label="Total after Discount (₹)"
                name="totalAfterDiscount"
                value={formData.totalAfterDiscount}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                readOnly
                className="bg-gray-100 font-semibold text-primary-700"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mt-4">
              <FloatingInput
                label="Transportation Charges (₹)"
                name="transportationCharges"
                value={formData.transportationCharges}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                error={errors.transportationCharges}
              />

              <FloatingInput
                label="GST Percentage (%)"
                name="gstPercentage"
                value={formData.gstPercentage}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0-100%"
                error={errors.gstPercentage}
              />

              <FloatingInput
                label="Total with GST (₹)"
                name="totalWithGST"
                value={formData.totalWithGST}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                readOnly
              />
            </div>

            <FloatingInput
              label="Overall Remarks"
              name="overallRemarks"
              value={formData.overallRemarks}
              onChange={handleChange}
              type="textarea"
              rows={3}
            />
          </div>

          {/* Payment Terms Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Payment Terms
            </h3>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Installment
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment  (%)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value (₹)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.paymentTerms.map((term, index) => {
                      const discountVal = parseFloat(term.discount || 0);
                      const calculatedValue = ((parseFloat(formData.totalWithGST || 0) * discountVal) / 100).toFixed(2);
                      const isOriginalTerm = boq && boq.paymentTerms && index < boq.paymentTerms.length;

                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Installment {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={term.discount}
                              onChange={(e) => handlePaymentTermChange(index, e.target.value)}
                              onBlur={(e) => handlePaymentTermBlur(index, e.target.value)}
                              readOnly={isOriginalTerm}
                              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border ${isOriginalTerm ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                              placeholder="0-100"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            ₹{parseFloat(calculatedValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="date"
                              value={term.dueDate || ''}
                              onChange={(e) => {
                                const newTerms = [...formData.paymentTerms];
                                newTerms[index] = { ...newTerms[index], dueDate: e.target.value };
                                setFormData(prev => ({ ...prev, paymentTerms: newTerms }));
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {/* Only show Add button on the last row and if total discount < 100 */}
                              {index === formData.paymentTerms.length - 1 && (
                                <button
                                  type="button"
                                  onClick={addPaymentTerm}
                                  disabled={formData.paymentTerms.length >= 5}
                                  className={`p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${formData.paymentTerms.length >= 5
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-primary-600 text-white hover:bg-primary-700'
                                    }`}
                                  title="Add Installment"
                                >
                                  <PlusIcon />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => removePaymentTerm(index)}
                                disabled={formData.paymentTerms.length <= 1 || isOriginalTerm}
                                className={`p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${formData.paymentTerms.length <= 1 || isOriginalTerm
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                title="Remove Installment"
                              >
                                <MinusIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900">
                        {formData.paymentTerms.reduce((sum, term) => sum + (parseFloat(term.discount) || 0), 0).toFixed(2)}%
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900">
                        ₹{formData.paymentTerms.reduce((sum, term) => {
                          const val = (parseFloat(formData.totalWithGST || 0) * (parseFloat(term.discount) || 0)) / 100;
                          return sum + val;
                        }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? 'Saving...' : boq ? 'Update BOQ' : 'Create BOQ'}
          </button>
        </div>
      </div>

      <NotificationComponent
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default BOQForm;
