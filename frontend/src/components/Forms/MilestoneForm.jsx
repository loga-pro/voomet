import React, { useState, useEffect } from 'react';
import { projectsAPI, milestonesAPI } from '../../services/api';
import { phaseOptions } from '../../data/taskConfig';
import FloatingInput from './FloatingInput';

const MilestoneForm = ({ milestone, onSuccess, onCancel, viewMode = false }) => {
  const [formData, setFormData] = useState({
    customer: '',
    projectName: '',
    startDate: '',
    endDate: '',
    emailId: '',
    tasks: [],
    flexibilityPercentage: 0 // New field for flexibility percentage
  });
  
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [originalEndDate, setOriginalEndDate] = useState(''); // Store original end date

  useEffect(() => {
    fetchAwardedProjects();
    
    if (milestone) {
      // Format dates properly when loading an existing milestone
      const formattedTasks = milestone.tasks ? milestone.tasks.map(task => ({
        ...task,
        startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
        endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : ''
      })) : [];
      
      setFormData({
        customer: milestone.customer || '',
        projectName: milestone.projectName || '',
        startDate: milestone.startDate ? new Date(milestone.startDate).toISOString().split('T')[0] : '',
        endDate: milestone.endDate ? new Date(milestone.endDate).toISOString().split('T')[0] : '',
        emailId: milestone.emailId || '',
        tasks: formattedTasks,
        flexibilityPercentage: milestone.flexibilityPercentage || 0
      });
      
      // Store original end date
      if (milestone.endDate) {
        setOriginalEndDate(new Date(milestone.endDate).toISOString().split('T')[0]);
      }
    } else {
      // Initialize with default tasks
      initializeDefaultTasks();
    }
  }, [milestone]);

  useEffect(() => {
    if (formData.customer) {
      const filtered = projects.filter(project => project.customerName === formData.customer);
      setFilteredProjects(filtered);
      
      // Set email ID if only one project matches
      if (filtered.length === 1) {
        setFormData(prev => ({
          ...prev,
          emailId: filtered[0].customerEmail || ''
        }));
      }
    } else {
      setFilteredProjects(projects);
    }
  }, [formData.customer, projects]);

  const fetchAwardedProjects = async () => {
    try {
      const response = await projectsAPI.getAll({ stage: 'awarded' });
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (error) {
      console.error('Error fetching awarded projects:', error);
    }
  };

  const initializeDefaultTasks = () => {
    const defaultTasks = [
      { phase: 'Project Initiation', task: 'Client meeting & requirement gathering', duration: 2, responsiblePerson: 'Project Manager' },
      { phase: 'Project Initiation', task: 'Site visit & measurements', duration: 1, responsiblePerson: 'Designer' },
      { phase: 'Concept Design', task: 'Mood board preparation', duration: 3, responsiblePerson: 'Designer' },
      { phase: 'Concept Design', task: 'Initial layout plan', duration: 4, responsiblePerson: 'Designer' },
      { phase: 'Concept Design', task: 'Client presentation & feedback', duration: 2, responsiblePerson: 'Designer' },
      { phase: 'Design Development', task: '3D renders & walkthrough', duration: 7, responsiblePerson: '3D Artist' },
      { phase: 'Design Development', task: 'Material selection & samples', duration: 5, responsiblePerson: 'Designer' },
      { phase: 'Design Development', task: 'Cost estimation & BOQ', duration: 4, responsiblePerson: 'Estimator' },
      { phase: 'Approval Phase', task: 'Final client approval', duration: 2, responsiblePerson: 'Project Manager' },
      { phase: 'Approval Phase', task: 'Sign-off on contracts', duration: 2, responsiblePerson: 'Project Manager' },
      { phase: 'Execution', task: 'Site preparation & demolition', duration: 5, responsiblePerson: 'Contractor' },
      { phase: 'Execution', task: 'Civil works', duration: 10, responsiblePerson: 'Civil Engineer' },
      { phase: 'Execution', task: 'Electrical & plumbing works', duration: 8, responsiblePerson: 'MEP Team' },
      { phase: 'Execution', task: 'False ceiling & partitions', duration: 6, responsiblePerson: 'Contractor' },
      { phase: 'Execution', task: 'Flooring installation', duration: 5, responsiblePerson: 'Contractor' },
      { phase: 'Execution', task: 'Wall finishes & painting', duration: 6, responsiblePerson: 'Painter' },
      { phase: 'Execution', task: 'Carpentry works', duration: 10, responsiblePerson: 'Carpenter' },
      { phase: 'Execution', task: 'Lighting installation', duration: 3, responsiblePerson: 'Electrician' },
      { phase: 'Execution', task: 'Furniture placement', duration: 3, responsiblePerson: 'Designer' },
      { phase: 'Execution', task: 'Final styling & decor', duration: 2, responsiblePerson: 'Designer' },
      { phase: 'Handover', task: 'Final client walkthrough', duration: 1, responsiblePerson: 'Project Manager' },
      { phase: 'Handover', task: 'Snag list & rectifications', duration: 3, responsiblePerson: 'Contractor' },
      { phase: 'Handover', task: 'Final handover & documentation', duration: 1, responsiblePerson: 'Project Manager' }
    ];
    
    setFormData(prev => ({
      ...prev,
      tasks: defaultTasks
    }));
  };

  // Fixed function to calculate business days excluding Sundays
  const calculateBusinessDays = (startDate, daysToAdd) => {
    let currentDate = new Date(startDate);
    let count = 0;
    
    // If daysToAdd is 0 or less, return the same date
    if (daysToAdd <= 0) {
      return currentDate.toISOString().split('T')[0];
    }
    
    while (count < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);
      
      // If it's not Sunday (0 is Sunday), count it as a business day
      if (currentDate.getDay() !== 0) {
        count++;
      }
    }
    
    return currentDate.toISOString().split('T')[0];
  };

  // Calculate total project duration in business days
  const calculateTotalBusinessDays = () => {
    if (!formData.startDate || !originalEndDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(originalEndDate);
    let count = 0;
    let current = new Date(start);
    
    while (current <= end) {
      // Skip Sundays (0 is Sunday)
      if (current.getDay() !== 0) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // Apply flexibility percentage to end date
  const applyFlexibility = (percentage) => {
    if (!originalEndDate || percentage === 0) {
      setFormData(prev => ({
        ...prev,
        endDate: originalEndDate,
        flexibilityPercentage: percentage
      }));
      return;
    }
    
    const totalDays = calculateTotalBusinessDays();
    const additionalDays = Math.ceil(totalDays * (percentage / 100));
    
    if (additionalDays > 0) {
      const newEndDate = calculateBusinessDays(new Date(originalEndDate), additionalDays);
      setFormData(prev => ({
        ...prev,
        endDate: newEndDate,
        flexibilityPercentage: percentage
      }));
    }
  };

  // Handle flexibility percentage change
  const handleFlexibilityChange = (e) => {
    const percentage = parseInt(e.target.value) || 0;
    applyFlexibility(percentage);
  };

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
    
    // If start date changes, update all task dates and reset flexibility
    if (name === 'startDate' && value) {
      updateTaskDates(value);
      // Reset flexibility when start date changes
      setFormData(prev => ({
        ...prev,
        flexibilityPercentage: 0
      }));
    }
  };

  // Fixed updateTaskDates function
  const updateTaskDates = (startDate) => {
    const newTasks = [...formData.tasks];
    let currentStartDate = new Date(startDate);
    
    // Calculate dates for each task based on duration (excluding Sundays)
    newTasks.forEach((task, index) => {
      if (task.duration > 0) {
        // Set task start date
        task.startDate = currentStartDate.toISOString().split('T')[0];
        
        // Calculate task end date
        task.endDate = calculateBusinessDays(currentStartDate, task.duration);
        
        // Move start date for next task to the day after current task ends
        // Skip Sundays when setting the next start date
        currentStartDate = new Date(task.endDate);
        do {
          currentStartDate.setDate(currentStartDate.getDate() + 1);
        } while (currentStartDate.getDay() === 0); // Skip Sundays
      } else {
        // If duration is 0, set same start and end date
        task.startDate = currentStartDate.toISOString().split('T')[0];
        task.endDate = currentStartDate.toISOString().split('T')[0];
      }
    });
    
    // Update project end date to be the last task end date
    const lastTask = newTasks[newTasks.length - 1];
    if (lastTask && lastTask.endDate) {
      const newEndDate = lastTask.endDate;
      setOriginalEndDate(newEndDate);
      setFormData(prev => ({
        ...prev,
        endDate: newEndDate,
        tasks: newTasks,
        flexibilityPercentage: 0 // Reset flexibility when dates change
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tasks: newTasks
      }));
    }
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...formData.tasks];
    newTasks[index][field] = value;
    
    // If duration changes, recalculate dates starting from this task
    if (field === 'duration') {
      const duration = parseInt(value) || 0;
      newTasks[index].duration = duration;
      
      if (newTasks[index].startDate) {
        const startDate = new Date(newTasks[index].startDate);
        newTasks[index].endDate = calculateBusinessDays(startDate, duration);
        
        // Update subsequent tasks
        updateSubsequentTasks(newTasks, index);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      tasks: newTasks
    }));
  };

  // Fixed updateSubsequentTasks function
  const updateSubsequentTasks = (tasks, updatedIndex) => {
    let currentStartDate = new Date(tasks[updatedIndex].endDate);
    
    // Skip Sundays for the next task start date
    do {
      currentStartDate.setDate(currentStartDate.getDate() + 1);
    } while (currentStartDate.getDay() === 0);
    
    for (let i = updatedIndex + 1; i < tasks.length; i++) {
      // Set start date for current task
      tasks[i].startDate = currentStartDate.toISOString().split('T')[0];
      
      // Calculate end date based on duration
      if (tasks[i].duration > 0) {
        tasks[i].endDate = calculateBusinessDays(currentStartDate, tasks[i].duration);
      } else {
        tasks[i].endDate = currentStartDate.toISOString().split('T')[0];
      }
      
      // Move to next task start date
      currentStartDate = new Date(tasks[i].endDate);
      do {
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      } while (currentStartDate.getDay() === 0); // Skip Sundays
    }
    
    // Update project end date
    const lastTask = tasks[tasks.length - 1];
    if (lastTask && lastTask.endDate) {
      const newEndDate = lastTask.endDate;
      setOriginalEndDate(newEndDate);
      setFormData(prev => ({
        ...prev,
        endDate: newEndDate
      }));
    }
  };

  const addNewTask = () => {
    const newTasks = [
      ...formData.tasks,
      {
        phase: '',
        task: '',
        duration: 0,
        responsiblePerson: '',
        startDate: '',
        endDate: ''
      }
    ];
    
    setFormData(prev => ({
      ...prev,
      tasks: newTasks
    }));
    
    // Scroll to the bottom of the table to show the new task
    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const deleteTask = (index) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const newTasks = [...formData.tasks];
      newTasks.splice(index, 1);
      
      // Recalculate dates for remaining tasks if there's a start date
      if (formData.startDate && newTasks.length > 0) {
        let currentStartDate = new Date(formData.startDate);
        
        newTasks.forEach((task) => {
          if (task.duration > 0) {
            task.startDate = currentStartDate.toISOString().split('T')[0];
            task.endDate = calculateBusinessDays(currentStartDate, task.duration);
            
            // Move to next task start date
            currentStartDate = new Date(task.endDate);
            do {
              currentStartDate.setDate(currentStartDate.getDate() + 1);
            } while (currentStartDate.getDay() === 0);
          }
        });
        
        // Update project end date
        const lastTask = newTasks[newTasks.length - 1];
        const newEndDate = lastTask && lastTask.endDate ? lastTask.endDate : formData.endDate;
        setOriginalEndDate(newEndDate);
        setFormData(prev => ({
          ...prev,
          tasks: newTasks,
          endDate: newEndDate,
          flexibilityPercentage: 0 // Reset flexibility when tasks change
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          tasks: newTasks
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.emailId) newErrors.emailId = 'Email ID is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      let response;
      if (milestone) {
        response = await milestonesAPI.update(milestone._id, formData);
      } else {
        response = await milestonesAPI.create(formData);
      }
      
      onSuccess(response.data);
    } catch (error) {
      console.error('Error saving milestone:', error);
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="Customer"
          name="customer"
          value={formData.customer}
          onChange={handleChange}
          error={errors.customer}
          type="select"
          options={[
            ...new Set(projects.map(p => p.customerName))
          ].map(customer => ({ value: customer, label: customer }))}
          required
          disabled={viewMode}
        />

        <FloatingInput
          label="Project Name"
          name="projectName"
          value={formData.projectName}
          onChange={handleChange}
          error={errors.projectName}
          type="select"
          options={filteredProjects.map(project => ({
            value: project.projectName,
            label: project.projectName
          }))}
          required
          disabled={viewMode}
        />

        <FloatingInput
          label="Start Date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          error={errors.startDate}
          type="date"
          required
          disabled={viewMode}
        />

        <FloatingInput
          label="End Date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          type="date"
          readOnly
        />

        <FloatingInput
          label="Email ID"
          name="emailId"
          value={formData.emailId}
          onChange={handleChange}
          error={errors.emailId}
          required
          disabled={viewMode}
        />

        {/* New Flexibility Percentage Field */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Flexibility Percentage (0-100%)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="100"
              value={formData.flexibilityPercentage}
              onChange={handleFlexibilityChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={viewMode || !formData.startDate}
            />
            <span className="w-16 text-sm font-medium text-gray-700">
              {formData.flexibilityPercentage}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Add buffer time to project timeline
          </p>
          {formData.flexibilityPercentage > 0 && (
            <p className="text-xs text-green-600 mt-1">
              +{Math.ceil(calculateTotalBusinessDays() * (formData.flexibilityPercentage / 100))} additional business days
            </p>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Project Tasks</h3>
          {!viewMode && (
            <button
              type="button"
              onClick={addNewTask}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Task
            </button>
          )}
        </div>

        <div className="table-container overflow-auto border border-gray-200 rounded-lg" style={{ maxHeight: '500px' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Duration (Days)</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Start Date</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">End Date</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible Person</th>
                {!viewMode && <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.tasks.map((task, index) => (
                <tr key={index}>
                  <td className="px-2 py-4">
                    {viewMode ? (
                      <span className="text-sm">{task.phase}</span>
                    ) : (
                      <input
                        type="text"
                        value={task.phase}
                        onChange={(e) => handleTaskChange(index, 'phase', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2"
                        list="phaseOptions"
                      />
                    )}
                  </td>
                  <td className="px-2 py-4">
                    {viewMode ? (
                      <span className="text-sm">{task.task}</span>
                    ) : (
                      <input
                        type="text"
                        value={task.task}
                        onChange={(e) => handleTaskChange(index, 'task', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2"
                      />
                    )}
                  </td>
                  <td className="px-2 py-4 w-24">
                    {viewMode ? (
                      <span className="text-sm">{task.duration}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={task.duration}
                        onChange={(e) => handleTaskChange(index, 'duration', parseInt(e.target.value) || 0)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2"
                      />
                    )}
                  </td>
                  <td className="px-2 py-4 w-32">
                    <span className="text-sm">
                      {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-4 w-32">
                    <span className="text-sm">
                      {task.endDate ? new Date(task.endDate).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="px-2 py-4">
                    {viewMode ? (
                      <span className="text-sm">{task.responsiblePerson}</span>
                    ) : (
                      <input
                        type="text"
                        value={task.responsiblePerson}
                        onChange={(e) => handleTaskChange(index, 'responsiblePerson', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2"
                      />
                    )}
                  </td>
                  {!viewMode && (
                    <td className="px-2 py-4 w-20">
                      <button
                        type="button"
                        onClick={() => deleteTask(index)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Datalist for phase options */}
        <datalist id="phaseOptions">
          {phaseOptions.map(phase => (
            <option key={phase} value={phase} />
          ))}
        </datalist>
      </div>

      {!viewMode && (
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : milestone ? 'Update' : 'Create'}
          </button>
        </div>
      )}
    </form>
  );
};

export default MilestoneForm;