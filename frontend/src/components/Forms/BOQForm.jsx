import React, { useState, useEffect, useCallback } from 'react';
import { partsAPI, boqAPI, projectsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import NotificationComponent from '../Notifications/Notification';

const BOQForm = ({ boq, onSubmit, onCancel, showNotification, showError }) => {
  const [formData, setFormData] = useState({
    customer: '',
    scopeOfWork: [],
    items: [{
      partName: '',
      numberOfUnits: '',
      unitType: '',
      unitPrice: '',
      totalPrice: '',
      remarks: '',
      image: null
    }],
    finalTotalWithoutGST: '0',
    transportationCharges: '0',
    gstPercentage: '18',
    totalWithGST: '0',
    overallRemarks: '',
  });
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Define showLocalNotification before fetch functions
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

  // Define fetch functions before using them in useEffect
  const fetchParts = useCallback(async () => {
    try {
      const response = await partsAPI.getAll();
      setParts(response.data);
      setFilteredParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
      showLocalNotification('Error fetching parts data', 'error');
    }
  }, [showLocalNotification]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  // Get unique scope of work values from parts data
  const scopeOfWorkOptions = parts.length > 0 
    ? [...new Set(parts.map(part => part.scopeOfWork))]
    : [];

  useEffect(() => {
    fetchParts();
    fetchProjects();
  }, [fetchParts, fetchProjects]);

  useEffect(() => {
    if (boq) {
      console.log('BOQ data for edit:', boq);
      console.log('BOQ items:', boq.items);
      console.log('BOQ scopeOfWork:', boq.scopeOfWork);
      
      // Convert scopeOfWork to array if it's a string
      let scopeOfWorkArray = boq.scopeOfWork || [];
      if (typeof scopeOfWorkArray === 'string') {
        scopeOfWorkArray = scopeOfWorkArray.split(',').filter(item => item.trim() !== '');
      }
      
      // Ensure items is properly formatted
      let formattedItems = boq.items || [];
      if (typeof formattedItems === 'string') {
        try {
          formattedItems = JSON.parse(formattedItems);
        } catch (e) {
          console.error('Error parsing items:', e);
          formattedItems = [];
        }
      }
      
      // If no items but we have virtual fields, create item from virtuals
      if ((!formattedItems || formattedItems.length === 0) && (boq.itemDescription || boq.partName)) {
        formattedItems = [{
          partName: boq.itemDescription || boq.partName || '',
          numberOfUnits: String(boq.quantity || boq.numberOfUnits || ''),
          unitType: boq.unit || boq.unitType || '',
          unitPrice: String(boq.unitPrice || ''),
          totalPrice: String(boq.totalPrice || (boq.quantity * boq.unitPrice) || ''),
          remarks: boq.remarks || '',
          image: null
        }];
      }
      
      // If still no items, provide default empty item
      if (!formattedItems || formattedItems.length === 0) {
        formattedItems = [{
          partName: '',
          numberOfUnits: '',
          unitType: '',
          unitPrice: '',
          totalPrice: '',
          remarks: '',
          image: null
        }];
      }
      
      // Handle image field and ensure all numeric fields are strings for form inputs
      formattedItems = formattedItems.map(item => {
        const processedItem = { ...item };
        
        // Ensure all fields have defined values (never undefined)
        processedItem.partName = item.partName || '';
        processedItem.numberOfUnits = String(item.numberOfUnits || '');
        processedItem.unitType = item.unitType || '';
        processedItem.unitPrice = String(item.unitPrice || '');
        processedItem.totalPrice = String(item.totalPrice || '');
        processedItem.remarks = item.remarks || '';
        
        // Handle image field
        if (item.image && typeof item.image === 'object' && item.image.path) {
          processedItem.image = item.image.path;
        } else {
          processedItem.image = null;
        }
        
        return processedItem;
      });
      
      // Handle root-level image if it exists
      let rootImage = null;
      if (boq.image && typeof boq.image === 'object' && boq.image.path) {
        rootImage = boq.image.path;
      }
      
      // If there's a root image and no item images, add it to the first item
      if (rootImage && formattedItems.length > 0 && !formattedItems[0].image) {
        formattedItems[0].image = rootImage;
      }
      
      const finalFormData = {
        customer: boq.customer || '',
        scopeOfWork: scopeOfWorkArray || [],
        items: formattedItems || [],
        finalTotalWithoutGST: String(boq.finalTotalWithoutGST || '0'),
        transportationCharges: String(boq.transportationCharges || '0'),
        gstPercentage: String(boq.gstPercentage || '18'),
        totalWithGST: String(boq.totalWithGST || '0'),
        overallRemarks: boq.overallRemarks || '',
      };
      
      console.log('Final form data:', finalFormData);
      console.log('Setting form data with items:', finalFormData.items);
      setFormData(finalFormData);
      setIsInitialLoad(false);
    } else {
      // Reset form data when no BOQ is provided (new item)
      setFormData({
        customer: '',
        scopeOfWork: [],
        items: [{
          partName: '',
          numberOfUnits: '',
          unitType: '',
          unitPrice: '',
          totalPrice: '',
          remarks: '',
          image: null
        }],
        finalTotalWithoutGST: '0',
        transportationCharges: '0',
        gstPercentage: '18',
        totalWithGST: '0',
        overallRemarks: '',
      });
      setIsInitialLoad(false);
    }
  }, [boq]);

  // Define calculateTotals before using it in useEffect
  const calculateTotals = useCallback(() => {
    // Calculate total for each item
    const updatedItems = formData.items.map(item => {
      const numberOfUnits = parseFloat(item.numberOfUnits || 0);
      const unitPrice = parseFloat(item.unitPrice || 0);
      const totalPrice = numberOfUnits * unitPrice;
      
      return {
        ...item,
        totalPrice: isNaN(totalPrice) ? 0 : totalPrice.toFixed(2)
      };
    });

    // Calculate final total without GST
    const itemsTotal = updatedItems.reduce((sum, item) => {
      return sum + parseFloat(item.totalPrice || 0);
    }, 0);

    const transportationCharges = parseFloat(formData.transportationCharges || 0);
    const finalTotalWithoutGST = itemsTotal + transportationCharges;
    
    // Calculate GST and total with GST
    const gstPercentage = parseFloat(formData.gstPercentage || 0);
    const gstAmount = finalTotalWithoutGST * (gstPercentage / 100);
    const totalWithGST = finalTotalWithoutGST + gstAmount;

    // Return the calculated values instead of setting state directly
    return {
      items: updatedItems,
      finalTotalWithoutGST: isNaN(finalTotalWithoutGST) ? '0' : finalTotalWithoutGST.toFixed(2),
      totalWithGST: isNaN(totalWithGST) ? '0' : totalWithGST.toFixed(2)
    };
  }, [formData.items, formData.transportationCharges, formData.gstPercentage]);

  useEffect(() => {
    // Only calculate totals if we have items and it's not the initial load
    if (!isInitialLoad && formData.items && formData.items.length > 0 && formData.items[0].partName) {
      const calculatedValues = calculateTotals();
      setFormData(prev => ({
        ...prev,
        ...calculatedValues
      }));
    }
  }, [formData.items, formData.transportationCharges, formData.gstPercentage, isInitialLoad, calculateTotals]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleScopeOfWorkChange = (scope) => {
    setFormData(prev => {
      const currentScopes = [...prev.scopeOfWork];
      const scopeIndex = currentScopes.indexOf(scope);
      
      if (scopeIndex > -1) {
        // Remove scope if already selected
        currentScopes.splice(scopeIndex, 1);
      } else {
        // Add scope if not selected
        currentScopes.push(scope);
      }
      
      return {
        ...prev,
        scopeOfWork: currentScopes
      };
    });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handlePartSelect = (index, partName) => {
    const selectedPart = parts.find(part => part.partName === partName);
    if (selectedPart) {
      const updatedItems = [...formData.items];
      updatedItems[index] = {
        ...updatedItems[index],
        partName: selectedPart.partName,
        unitType: selectedPart.unitType,
        unitPrice: selectedPart.partPrice
      };
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const handleItemFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showLocalNotification('File size must be less than 5MB', 'error');
        return;
      }
      
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        showLocalNotification('Only images and PDF files are allowed', 'error');
        return;
      }
      
      const updatedItems = [...formData.items];
      updatedItems[index] = {
        ...updatedItems[index],
        image: file
      };
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          partName: '',
          numberOfUnits: '',
          unitType: '',
          unitPrice: '',
          totalPrice: '',
          remarks: '',
          image: null
        }
      ]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items];
      updatedItems.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (formData.scopeOfWork.length === 0) newErrors.scopeOfWork = 'At least one scope of work is required';
    
    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.partName) newErrors[`item-${index}-partName`] = 'Part name is required';
      if (!item.numberOfUnits || item.numberOfUnits <= 0) newErrors[`item-${index}-numberOfUnits`] = 'Valid number of units is required';
      if (!item.unitPrice || item.unitPrice <= 0) newErrors[`item-${index}-unitPrice`] = 'Valid unit price is required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = new FormData();
      
      // Attach only the first image file found to match backend upload.single('image')
      let attachedImage = false;
      const itemsWithoutImages = (formData.items || []).map(item => {
        if (!attachedImage && item.image && item.image instanceof File) {
          submitData.append('image', item.image);
          attachedImage = true;
        }
        const { image, ...rest } = item;
        // Preserve string image reference inside item if present (viewing existing)
        return typeof item.image === 'string' ? { ...rest, image: item.image } : rest;
      });

      // Append items without File objects
      submitData.append('items', JSON.stringify(itemsWithoutImages));

      // Append other scalar fields
      submitData.append('customer', formData.customer);
      submitData.append('scopeOfWork', (formData.scopeOfWork || []).join(','));
      submitData.append('finalTotalWithoutGST', formData.finalTotalWithoutGST);
      submitData.append('transportationCharges', formData.transportationCharges);
      submitData.append('gstPercentage', formData.gstPercentage);
      submitData.append('totalWithGST', formData.totalWithGST);
      submitData.append('overallRemarks', formData.overallRemarks);

      if (boq && boq._id) {
        await boqAPI.update(boq._id, submitData);
        if (showNotification) showNotification('BOQ updated successfully!');
      } else {
        await boqAPI.create(submitData);
        if (showNotification) showNotification('BOQ created successfully!');
      }
      onSubmit();
    } catch (error) {
      console.error('Error submitting BOQ:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors({ submit: errorMessage });
      if (showError) {
        showError(errorMessage);
      } else {
        showLocalNotification(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get unique customers from projects
  const customerOptions = [...new Set(projects.map(project => project.customerName))].filter(Boolean);

  // SVG Trash Icon
  const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );

  // Debug: Log current form data
  console.log('Current form data in render:', formData);
  console.log('Current form items:', formData.items);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Field - Read-only when editing, dropdown when creating */}
          {boq ? (
            <FloatingInput
              label="Customer"
              name="customer"
              value={formData.customer}
              readOnly={true}
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
              options={customerOptions.map(customer => ({ value: customer, label: customer }))}
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work</label>
            <div className="flex flex-wrap gap-3">
              {scopeOfWorkOptions.map(scope => (
                <div key={scope} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`scope-${scope}`}
                    checked={formData.scopeOfWork.includes(scope)}
                    onChange={() => handleScopeOfWorkChange(scope)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`scope-${scope}`} className="ml-2 block text-sm text-gray-700">
                    {scope}
                  </label>
                </div>
              ))}
            </div>
            {errors.scopeOfWork && (
              <p className="mt-1 text-sm text-red-600">{errors.scopeOfWork}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Row
            </button>
          </div>

          <div className={`${formData.items.length > 3 ? 'max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50' : ''}`}>
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700 bg-blue-100 px-2 py-1 rounded">
                      Item {index + 1}
                    </span>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Remove item"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <FloatingInput
                      label="Part Name"
                      value={item.partName}
                      onChange={(e) => handlePartSelect(index, e.target.value)}
                      error={errors[`item-${index}-partName`]}
                      type="select"
                      options={parts.map(part => ({
                        value: part.partName,
                        label: `${part.partName} (${part.unitType}) - ₹${part.partPrice}`
                      }))}
                      required
                    />

                    <FloatingInput
                      label="Number of Units"
                      value={item.numberOfUnits}
                      onChange={(e) => handleItemChange(index, 'numberOfUnits', e.target.value)}
                      error={errors[`item-${index}-numberOfUnits`]}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                    />

                    <FloatingInput
                      label="Unit Type"
                      value={item.unitType}
                      onChange={(e) => handleItemChange(index, 'unitType', e.target.value)}
                      readOnly
                    />

                    <FloatingInput
                      label="Unit Price (₹)"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      error={errors[`item-${index}-unitPrice`]}
                      type="number"
                      step="0.01"
                      min="0"
                      readOnly
                      required
                    />

                    <FloatingInput
                      label="Total Price (₹)"
                      value={item.totalPrice}
                      readOnly
                      type="number"
                      step="0.01"
                      min="0"
                    />

                    <div className="flex flex-col space-y-2">
                      <FloatingInput
                        label="Remarks"
                        value={item.remarks}
                        onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                        type="text"
                      />
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Item Image/File</label>
                        <input
                          type="file"
                          onChange={(e) => handleItemFileChange(index, e)}
                          accept="image/*,.pdf"
                          className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                          {item.image && typeof item.image === 'string' && (
                          <div className="mt-2">
                            <a 
                              href={item.image.startsWith('http') ? item.image : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${item.image}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View uploaded file
                            </a>
                          </div>
                        )}
                        {item.image && item.image instanceof File && (
                          <div className="mt-2">
                            <span className="text-xs text-green-600 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              New file selected: {item.image.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md">
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
            label="Transportation Charges (₹)"
            name="transportationCharges"
            value={formData.transportationCharges}
            onChange={handleChange}
            type="number"
            step="0.01"
            min="0"
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

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : boq ? 'Update' : 'Create'}
          </button>
        </div>
      </form>

      <NotificationComponent
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </>
  );
};

export default BOQForm;