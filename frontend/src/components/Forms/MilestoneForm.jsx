import React, { useState, useEffect } from 'react';
import { projectsAPI, milestonesAPI, inhouseMilestonesAPI, customersAPI, reportsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import { Tooltip, Modal, Button, Alert, Card, InputNumber, Slider, Tag, message, Row, Col, Divider } from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  MailOutlined,
  UserOutlined,
  ProjectOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const MilestoneForm = ({ milestone, onSuccess, onCancel, viewMode = false, onEmailChange }) => {
  const phaseOptions = [
    'Project Initiation',
    'Concept Design',
    'Design Development',
    'Approval Phase',
    'Execution',
    'Handover'
  ];

  const [formData, setFormData] = useState({
    customer: '',
    projectName: '',
    startDate: '',
    endDate: '',
    emailId: '',
    category: 'outsourced',
    tasks: [],
    flexibilityPercentage: 0
  });

  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [originalEndDate, setOriginalEndDate] = useState('');
  const [customers, setCustomers] = useState([]);
  const [isEmailSyncing, setIsEmailSyncing] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [originalTasks, setOriginalTasks] = useState([]);
  const [showFlexibilityModal, setShowFlexibilityModal] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize form data
  useEffect(() => {
    const initializeForm = async () => {
      if (!dataLoaded) {
        await fetchProjectsByStages();
      }

      if (milestone) {
        const formattedTasks = milestone.tasks
          ? milestone.tasks.map(task => ({
            ...task,
            startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
            endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
            originalDuration: task.duration || 0
          }))
          : [];

        setFormData({
          customer: milestone.customer || '',
          projectName: milestone.projectName || '',
          startDate: milestone.startDate ? new Date(milestone.startDate).toISOString().split('T')[0] : '',
          endDate: milestone.endDate ? new Date(milestone.endDate).toISOString().split('T')[0] : '',
          emailId: milestone.emailId || '',
          category: milestone.category || 'outsourced',
          tasks: formattedTasks,
          flexibilityPercentage: milestone.flexibilityPercentage || 0
        });

        if (milestone.endDate) {
          setOriginalEndDate(new Date(milestone.endDate).toISOString().split('T')[0]);
        }

        setOriginalTasks(
          formattedTasks.map(task => ({
            ...task,
            originalDuration: task.duration || 0
          }))
        );

        calculateTotalDuration(formattedTasks);
      } else {
        initializeDefaultTasks();
      }
    };

    initializeForm();
  }, [milestone, dataLoaded]);

  // Email auto-sync with customer master
  useEffect(() => {
    let emailSyncInterval;

    const syncEmailFromCustomer = async (showLoading = false) => {
      if (formData.customer && !viewMode) {
        try {
          if (showLoading) setIsEmailSyncing(true);

          const currentEmail = await fetchCustomerEmail(formData.customer);
          if (currentEmail && currentEmail !== formData.emailId) {
            setFormData(prev => ({
              ...prev,
              emailId: currentEmail
            }));

            if (milestone && milestone._id) {
              try {
                const updateData = { ...milestone, emailId: currentEmail };
                const isInhouse = milestone.category === 'inhouse';
                const apiToUse = isInhouse ? inhouseMilestonesAPI : milestonesAPI;
                await apiToUse.update(milestone._id, updateData);

                if (onEmailChange) {
                  onEmailChange(milestone._id, currentEmail);
                }
              } catch (saveError) {
                console.error('Error auto-saving synced email:', saveError);
                setFormData(prev => ({
                  ...prev,
                  emailId: formData.emailId
                }));
              }
            } else {
              if (onEmailChange) {
                onEmailChange(null, currentEmail);
              }
            }
          }
        } catch (error) {
          console.error('Error syncing customer email:', error);
        } finally {
          if (showLoading) setIsEmailSyncing(false);
        }
      }
    };

    syncEmailFromCustomer();
    emailSyncInterval = setInterval(() => syncEmailFromCustomer(false), 30000);

    return () => {
      if (emailSyncInterval) {
        clearInterval(emailSyncInterval);
      }
    };
  }, [formData.customer, viewMode, formData.emailId, milestone, onEmailChange]);

  // Filter projects when customer changes
  useEffect(() => {
    if (formData.customer) {
      const filtered = projects.filter(project => project.customerName === formData.customer);
      setFilteredProjects(filtered);

      const fetchEmail = async () => {
        const email = await fetchCustomerEmail(formData.customer);
        if (email) {
          setFormData(prev => ({
            ...prev,
            emailId: email
          }));
        }
      };

      fetchEmail();
    } else {
      setFilteredProjects([]);
      setFormData(prev => ({
        ...prev,
        emailId: '',
        projectName: ''
      }));
    }
  }, [formData.customer, projects]);

  // Calculate total duration whenever tasks change
  useEffect(() => {
    const duration = formData.tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
    setTotalDuration(duration);
  }, [formData.tasks]);

  // API Functions
  const fetchProjectsByStages = async () => {
    setCustomersLoading(true);
    try {
      const stages = ['boq', 'awarded', 'under_execution', 'completed', 'post_implementation'];
      const allProjects = [];

      const projectPromises = stages.map(async stage => {
        try {
          const response = await projectsAPI.getAll({ stage });
          return response.data || [];
        } catch (stageError) {
          console.error(`Error fetching projects for stage ${stage}:`, stageError);
          return [];
        }
      });

      const results = await Promise.all(projectPromises);
      results.forEach(stageProjects => {
        if (stageProjects.length > 0) {
          allProjects.push(...stageProjects);
        }
      });

      const uniqueProjects = allProjects.filter(
        (project, index, self) =>
          index === self.findIndex(p => p.projectName === project.projectName)
      );

      setProjects(uniqueProjects);
      setFilteredProjects(uniqueProjects);

      const customerNames = [
        ...new Set(allProjects.map(project => project.customerName).filter(Boolean))
      ];

      if (customerNames.length > 0) {
        const customersResponse = await customersAPI.getAll();
        const allCustomers = customersResponse.data || [];

        const filteredCustomers = allCustomers.filter(customer =>
          customerNames.includes(customer.customerName)
        );

        setCustomers(filteredCustomers);
      } else {
        setCustomers([]);
      }

      setDataLoaded(true);

      if (uniqueProjects.length > 0) {
        const customer = uniqueProjects[0];
        return customer.customerEmail || '';
      }
      return '';
    } catch (error) {
      console.error('Error fetching projects:', error);
      setCustomers([]);
      setDataLoaded(false);
      return '';
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchCustomerEmail = async customerName => {
    try {
      const response = await customersAPI.getAll({ customerName });
      if (response.data && response.data.length > 0) {
        return response.data[0].customerEmail || '';
      }
      return '';
    } catch (error) {
      console.error('Error fetching customer email:', error);
      return '';
    }
  };

  const initializeDefaultTasks = () => {
    const defaultTasks = [
      { phase: 'Project Initiation', task: 'Client meeting & requirement gathering', duration: 2, responsiblePerson: 'Project Manager', originalDuration: 2 },
      { phase: 'Project Initiation', task: 'Site visit & measurements', duration: 1, responsiblePerson: 'Designer', originalDuration: 1 },
      { phase: 'Concept Design', task: 'Mood board preparation', duration: 3, responsiblePerson: 'Designer', originalDuration: 3 },
      { phase: 'Concept Design', task: 'Initial layout plan', duration: 4, responsiblePerson: 'Designer', originalDuration: 4 },
      { phase: 'Concept Design', task: 'Client presentation & feedback', duration: 2, responsiblePerson: 'Designer', originalDuration: 2 },
      { phase: 'Design Development', task: '3D renders & walkthrough', duration: 7, responsiblePerson: '3D Artist', originalDuration: 7 },
      { phase: 'Design Development', task: 'Material selection & samples', duration: 5, responsiblePerson: 'Designer', originalDuration: 5 },
      { phase: 'Design Development', task: 'Cost estimation & BOQ', duration: 4, responsiblePerson: 'Estimator', originalDuration: 4 },
      { phase: 'Approval Phase', task: 'Final client approval', duration: 2, responsiblePerson: 'Project Manager', originalDuration: 2 },
      { phase: 'Approval Phase', task: 'Sign-off on contracts', duration: 2, responsiblePerson: 'Project Manager', originalDuration: 2 },
      { phase: 'Execution', task: 'Site preparation & demolition', duration: 5, responsiblePerson: 'Contractor', originalDuration: 5 },
      { phase: 'Execution', task: 'Civil works', duration: 10, responsiblePerson: 'Civil Engineer', originalDuration: 10 },
      { phase: 'Execution', task: 'Electrical & plumbing works', duration: 8, responsiblePerson: 'MEP Team', originalDuration: 8 },
      { phase: 'Execution', task: 'False ceiling & partitions', duration: 6, responsiblePerson: 'Contractor', originalDuration: 6 },
      { phase: 'Execution', task: 'Flooring installation', duration: 5, responsiblePerson: 'Contractor', originalDuration: 5 },
      { phase: 'Execution', task: 'Wall finishes & painting', duration: 6, responsiblePerson: 'Painter', originalDuration: 6 },
      { phase: 'Execution', task: 'Carpentry works', duration: 10, responsiblePerson: 'Carpenter', originalDuration: 10 },
      { phase: 'Execution', task: 'Lighting installation', duration: 3, responsiblePerson: 'Electrician', originalDuration: 3 },
      { phase: 'Execution', task: 'Furniture placement', duration: 3, responsiblePerson: 'Designer', originalDuration: 3 },
      { phase: 'Execution', task: 'Final styling & decor', duration: 2, responsiblePerson: 'Designer', originalDuration: 2 },
      { phase: 'Handover', task: 'Final client walkthrough', duration: 1, responsiblePerson: 'Project Manager', originalDuration: 1 },
      { phase: 'Handover', task: 'Snag list & rectifications', duration: 3, responsiblePerson: 'Contractor', originalDuration: 3 },
      { phase: 'Handover', task: 'Final handover & documentation', duration: 1, responsiblePerson: 'Project Manager', originalDuration: 1 }
    ];

    setFormData(prev => ({
      ...prev,
      tasks: defaultTasks
    }));

    setOriginalTasks([...defaultTasks]);
    calculateTotalDuration(defaultTasks);
  };

  const calculateTotalDuration = tasks => {
    const duration = tasks.reduce((sum, task) => sum + (task.duration || 0), 0);
    setTotalDuration(duration);
  };

  const calculateBusinessDays = (startDate, daysToAdd) => {
    let currentDate = new Date(startDate);

    if (daysToAdd <= 0) {
      return currentDate.toISOString().split('T')[0];
    }

    currentDate.setDate(currentDate.getDate() + (daysToAdd - 1));

    return currentDate.toISOString().split('T')[0];
  };

  const updateTaskDates = startDate => {
    const newTasks = [...formData.tasks];
    let currentStartDate = new Date(startDate);

    newTasks.forEach(task => {
      if (task.duration > 0) {
        task.startDate = currentStartDate.toISOString().split('T')[0];
        task.endDate = calculateBusinessDays(currentStartDate, task.duration);

        currentStartDate = new Date(task.endDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      } else {
        task.startDate = currentStartDate.toISOString().split('T')[0];
        task.endDate = currentStartDate.toISOString().split('T')[0];
      }
    });

    const lastTask = newTasks[newTasks.length - 1];
    if (lastTask && lastTask.endDate) {
      const newEndDate = lastTask.endDate;
      setOriginalEndDate(newEndDate);
      setFormData(prev => ({
        ...prev,
        endDate: newEndDate,
        tasks: newTasks,
        flexibilityPercentage: 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tasks: newTasks
      }));
    }
  };

  // Handle task start date change - propagate to subsequent tasks
  const handleTaskStartDateChange = (index, newStartDate) => {
    // First record (index 0) should not be editable directly
    // This is handled in the UI, but we add protection here too
    if (index === 0) return;

    const newTasks = [...formData.tasks];

    // Update the start date for the selected task
    const startDate = new Date(newStartDate);
    newTasks[index].startDate = startDate.toISOString().split('T')[0];

    // Calculate end date based on duration
    if (newTasks[index].duration > 0) {
      newTasks[index].endDate = calculateBusinessDays(startDate, newTasks[index].duration);
    } else {
      newTasks[index].endDate = startDate.toISOString().split('T')[0];
    }

    // Propagate changes to all subsequent tasks
    let currentStartDate = new Date(newTasks[index].endDate);
    currentStartDate.setDate(currentStartDate.getDate() + 1);

    for (let i = index + 1; i < newTasks.length; i++) {
      newTasks[i].startDate = currentStartDate.toISOString().split('T')[0];

      if (newTasks[i].duration > 0) {
        newTasks[i].endDate = calculateBusinessDays(currentStartDate, newTasks[i].duration);
      } else {
        newTasks[i].endDate = currentStartDate.toISOString().split('T')[0];
      }

      currentStartDate = new Date(newTasks[i].endDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
    }

    // Update the overall end date based on the last task
    const lastTask = newTasks[newTasks.length - 1];
    if (lastTask && lastTask.endDate) {
      const newEndDate = lastTask.endDate;
      setOriginalEndDate(newEndDate);
      setFormData(prev => ({
        ...prev,
        endDate: newEndDate,
        tasks: newTasks
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tasks: newTasks
      }));
    }
  };

  const handleTaskChange = (index, field, value) => {
    if (field === 'phase' && value.length > 30) {
      value = value.substring(0, 30);
    } else if (field === 'task' && value.length > 250) {
      value = value.substring(0, 250);
    } else if (field === 'responsiblePerson' && value.length > 30) {
      value = value.substring(0, 30);
    }

    const newTasks = [...formData.tasks];

    if (field === 'duration') {
      const duration = parseInt(value) || 0;
      newTasks[index].duration = duration;
      newTasks[index].originalDuration = duration;

      if (duration === 0) {
        newTasks[index].duration = '';
      }

      if (newTasks[index].startDate) {
        const startDate = new Date(newTasks[index].startDate);
        newTasks[index].endDate = calculateBusinessDays(startDate, duration);

        updateSubsequentTasks(newTasks, index);
      }
    } else {
      newTasks[index][field] = value;
    }

    setFormData(prev => ({
      ...prev,
      tasks: newTasks
    }));

    if (field === 'duration') {
      const updatedOriginalTasks = [...originalTasks];
      updatedOriginalTasks[index] = {
        ...updatedOriginalTasks[index],
        originalDuration: parseInt(value) || 0
      };
      setOriginalTasks(updatedOriginalTasks);
    }
  };

  const updateSubsequentTasks = (tasks, updatedIndex) => {
    let currentStartDate = new Date(tasks[updatedIndex].endDate);
    currentStartDate.setDate(currentStartDate.getDate() + 1);

    for (let i = updatedIndex + 1; i < tasks.length; i++) {
      tasks[i].startDate = currentStartDate.toISOString().split('T')[0];

      if (tasks[i].duration > 0) {
        tasks[i].endDate = calculateBusinessDays(currentStartDate, tasks[i].duration);
      } else {
        tasks[i].endDate = currentStartDate.toISOString().split('T')[0];
      }

      currentStartDate = new Date(tasks[i].endDate);
      currentStartDate.setDate(currentStartDate.getDate() + 1);
    }

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
    if (!formData.startDate) {
      Modal.warning({
        title: 'Start Date Required',
        content: 'Please set a start date first before adding tasks.'
      });
      return;
    }

    const newTasks = [...formData.tasks];
    let nextStartDate = new Date(formData.startDate);

    if (newTasks.length > 0) {
      const lastTask = newTasks[newTasks.length - 1];
      if (lastTask.endDate) {
        nextStartDate = new Date(lastTask.endDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
      }
    }

    const newTask = {
      phase: '',
      task: '',
      duration: 0,
      originalDuration: 0,
      responsiblePerson: '',
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextStartDate.toISOString().split('T')[0]
    };

    newTasks.push(newTask);

    setFormData(prev => ({
      ...prev,
      tasks: newTasks
    }));

    setOriginalTasks(prev => [...prev, { ...newTask }]);

    setTimeout(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const deleteTask = index => {
    Modal.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        const newTasks = [...formData.tasks];
        newTasks.splice(index, 1);

        const newOriginalTasks = [...originalTasks];
        newOriginalTasks.splice(index, 1);
        setOriginalTasks(newOriginalTasks);

        if (formData.startDate && newTasks.length > 0) {
          let currentStartDate = new Date(formData.startDate);

          newTasks.forEach(task => {
            if (task.duration > 0) {
              task.startDate = currentStartDate.toISOString().split('T')[0];
              task.endDate = calculateBusinessDays(currentStartDate, task.duration);

              currentStartDate = new Date(task.endDate);
              currentStartDate.setDate(currentStartDate.getDate() + 1);
            }
          });

          const lastTask = newTasks[newTasks.length - 1];
          const newEndDate =
            lastTask && lastTask.endDate ? lastTask.endDate : formData.endDate;
          setOriginalEndDate(newEndDate);
          setFormData(prev => ({
            ...prev,
            tasks: newTasks,
            endDate: newEndDate,
            flexibilityPercentage: 0
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            tasks: newTasks
          }));
        }
      }
    });
  };

  // Flexibility
  const applyFlexibility = percentage => {
    if (!formData.startDate || formData.tasks.length === 0) return;

    const totalOriginalDuration = originalTasks.reduce(
      (sum, task) => sum + (task.originalDuration || task.duration || 0),
      0
    );

    if (totalOriginalDuration === 0) {
      setFormData(prev => ({
        ...prev,
        flexibilityPercentage: percentage
      }));
      return;
    }

    const totalDaysToAdd = Math.ceil(totalOriginalDuration * (percentage / 100));

    const updatedTasks = formData.tasks.map(task => {
      const originalTaskDuration = task.originalDuration || task.duration || 0;
      if (originalTaskDuration === 0) return task;

      const proportion = originalTaskDuration / totalOriginalDuration;
      const daysToAdd = Math.round(proportion * totalDaysToAdd);
      const newDuration = Math.max(1, originalTaskDuration + daysToAdd);

      return {
        ...task,
        duration: newDuration,
        flexibilityAdded: daysToAdd
      };
    });

    setFormData(prev => ({
      ...prev,
      tasks: updatedTasks,
      flexibilityPercentage: percentage
    }));

    updateTaskDatesWithFlexibility(updatedTasks);
  };

  const updateTaskDatesWithFlexibility = tasks => {
    if (!formData.startDate) return;

    const updatedTasks = [...tasks];
    let currentStartDate = new Date(formData.startDate);

    updatedTasks.forEach(task => {
      if (task.duration > 0) {
        task.startDate = currentStartDate.toISOString().split('T')[0];
        task.endDate = calculateBusinessDays(currentStartDate, task.duration);

        currentStartDate = new Date(task.endDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      } else {
        task.startDate = currentStartDate.toISOString().split('T')[0];
        task.endDate = currentStartDate.toISOString().split('T')[0];
      }
    });

    const lastTask = updatedTasks[updatedTasks.length - 1];
    if (lastTask && lastTask.endDate) {
      const newEndDate = lastTask.endDate;
      setOriginalEndDate(newEndDate);
      setFormData(prev => ({
        ...prev,
        endDate: newEndDate,
        tasks: updatedTasks
      }));
    }
  };

  const handleFlexibilityChange = value => {
    const percentage = parseInt(value) || 0;
    applyFlexibility(percentage);
  };

  const calculateFlexibilitySummary = () => {
    if (formData.flexibilityPercentage === 0 || formData.tasks.length === 0) {
      return null;
    }

    const totalOriginalDuration = originalTasks.reduce(
      (sum, task) => sum + (task.originalDuration || 0),
      0
    );
    const totalDaysAdded = Math.ceil(
      totalOriginalDuration * (formData.flexibilityPercentage / 100)
    );

    const distribution = formData.tasks
      .map(task => {
        const originalDuration = task.originalDuration || task.duration || 0;
        if (originalDuration === 0) return null;

        const proportion = originalDuration / totalOriginalDuration;
        const daysAdded = Math.round(proportion * totalDaysAdded);
        const newDuration = Math.max(1, originalDuration + daysAdded);
        const actualAdded = newDuration - originalDuration;

        return {
          task: task.task || `Task ${task.index}`,
          originalDuration,
          daysAdded: actualAdded,
          newDuration,
          percentageIncrease:
            originalDuration > 0
              ? ((actualAdded / originalDuration) * 100).toFixed(1)
              : '0'
        };
      })
      .filter(Boolean);

    const actualTotalAdded = distribution.reduce((sum, item) => sum + item.daysAdded, 0);

    return {
      totalOriginalDuration,
      totalDaysAdded: actualTotalAdded,
      distribution,
      newTotalDuration: totalOriginalDuration + actualTotalAdded
    };
  };

  // Validation & submit
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.emailId) newErrors.emailId = 'Email ID is required';

    formData.tasks.forEach((task, index) => {
      if (!task.phase && !viewMode) {
        newErrors[`task_${index}_phase`] = `Phase is required for task ${index + 1}`;
      }
      if (!task.task && !viewMode) {
        newErrors[`task_${index}_task`] = `Task description is required for task ${index + 1}`;
      }
      if ((!task.duration || task.duration === 0) && !viewMode) {
        newErrors[`task_${index}_duration`] = `Duration is required for task ${index + 1}`;
      }
      if (!task.responsiblePerson && !viewMode) {
        newErrors[`task_${index}_responsiblePerson`] = `Responsible Person is required for task ${index + 1}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkForDuplicate = async (customer, projectName) => {
    try {
      const [regularResponse, inhouseResponse] = await Promise.all([
        milestonesAPI.getAll({
          customer: customer,
          projectName: projectName
        }),
        inhouseMilestonesAPI.getAll({
          customer: customer,
          projectName: projectName
        })
      ]);

      const regularMilestones = regularResponse.data.milestones || regularResponse.data || [];
      const inhouseMilestones = inhouseResponse.data.milestones || inhouseResponse.data || [];
      const allMilestones = [...regularMilestones, ...inhouseMilestones];

      if (milestone) {
        const filteredMilestones = allMilestones.filter(m => m._id !== milestone._id);
        return filteredMilestones.length > 0;
      }

      return allMilestones.length > 0;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  };

  const handleSubmit = async e => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateForm()) return;

    const isDuplicate = await checkForDuplicate(
      formData.customer,
      formData.projectName,
      formData.startDate
    );
    if (!milestone && isDuplicate) {
      setErrors({
        submit: 'A milestone with the same customer and project name already exists.'
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      const isInhouse = formData.category === 'inhouse';
      const apiToUse = isInhouse ? inhouseMilestonesAPI : milestonesAPI;

      if (milestone) {
        const isEditingInhouse = milestone.category === 'inhouse';
        const editApi = isEditingInhouse ? inhouseMilestonesAPI : milestonesAPI;
        response = await editApi.update(milestone._id, formData);
      } else {
        response = await apiToUse.create(formData);
      }

      message.success(
        milestone ? 'Milestone updated successfully!' : 'Milestone created successfully!'
      );
      onSuccess(response.data);
    } catch (error) {
      console.error('Error saving milestone:', error);
      const errorMessage =
        error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors({ submit: errorMessage });
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const flexibilitySummary = calculateFlexibilitySummary();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Make the entire form scrollable */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
        <div className="p-3 md:p-4 lg:p-6">
          {errors.submit && (
            <Alert
              message="Error"
              description={errors.submit}
              type="error"
              showIcon
              className="mb-4"
              closable
              onClose={() => setErrors(prev => ({ ...prev, submit: null }))}
            />
          )}

          {/* Compact Form Header - Similar to your image */}
          <Card size="small" className="shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">

              <FloatingInput
                label="Client Name"
                type="select"
                size="small"
                value={formData.customer}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    customer: e.target.value,
                    projectName: ''
                  }))
                }
                options={customers.map(c => ({
                  value: c.customerName,
                  label: c.customerName
                }))}
                error={errors.customer}
                required
                disabled={viewMode}
              />

              <FloatingInput
                label="Project Name"
                type="select"
                size="small"
                value={formData.projectName}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    projectName: e.target.value
                  }))
                }
                options={filteredProjects.map(p => ({
                  value: p.projectName,
                  label: p.projectName
                }))}
                error={errors.projectName}
                required
                disabled={!formData.customer || viewMode}
              />

              <FloatingInput
                label="Email ID"
                size="small"
                value={formData.emailId}
                readOnly
                disabled
                required
              />

              <FloatingInput
                label="Start Date"
                type="date"
                size="small"
                value={formData.startDate}
                onChange={e => {
                  setFormData(prev => ({ ...prev, startDate: e.target.value }));
                  if (e.target.value && formData.tasks.length > 0) {
                    updateTaskDates(e.target.value);
                  }
                }}
                error={errors.startDate}
                required
                disabled={viewMode}
              />

              <FloatingInput
                label="End Date"
                type="date"
                size="small"
                value={formData.endDate}
                readOnly
                disabled
              />


            </div>
          </Card>


          {/* Project Flexibility Section */}
          <Card size="small" className="shadow-sm mb-4">
            <div className="flex flex-col gap-2">

              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">
                  Timeline Flexibility
                </span>

                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {formData.flexibilityPercentage}%
                </span>
              </div>

              <Slider
                min={0}
                max={100}
                value={formData.flexibilityPercentage}
                onChange={handleFlexibilityChange}
                disabled={viewMode || !formData.startDate || formData.tasks.length === 0}
                tooltip={{ formatter: v => `${v}%` }}
                className="mt-1"
              />

              <p className="text-[11px] text-gray-500 leading-tight">
                Adjusts project timeline by adding days proportionally to all tasks
              </p>

            </div>
          </Card>


          {/* Tasks Table Section */}
          <div className="bg-white rounded-lg border overflow-hidden mb-8">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  Project Tasks
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tasks.length} tasks, {totalDuration} days total
                </p>
              </div>
              {!viewMode && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addNewTask}
                  disabled={!formData.startDate}
                  size={isMobile ? 'small' : 'default'}
                  className="text-xs md:text-sm"
                >
                  Add Task
                </Button>
              )}
            </div>

            <div
              className="table-container overflow-auto"
              style={{
                maxHeight: '350px',
              }}
            >
              <table className="min-w-[900px] w-full divide-y divide-gray-200 table-fixed">
                <colgroup><col className="w-[18%]" /><col className="w-[26%]" /><col className="w-[10%]" /><col className="w-[16%]" /><col className="w-[12%]" /><col className="w-[8%]" />{!viewMode && <col className="w-[4%]" />}</colgroup>

                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider sticky left-0 top-0 bg-gray-50 z-30">
                      Phase *
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-20">
                      Task *
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-20">
                      Duration *
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-20">
                      Responsible Person*
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-20">
                      Start Date
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-20">
                      End Date
                    </th>
                    {!viewMode && (
                      <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 top-0 bg-gray-50 z-30">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.tasks.map((task, index) => {
                    const originalDuration = task.originalDuration || 0;
                    const flexibilityAdded = task.duration - originalDuration;

                    return (
                      <tr
                        key={index}
                        className={
                          flexibilityAdded > 0 ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                        }
                      >
                        {/* Phase */}
                        <td className="px-3 md:px-4 py-2 md:py-3 sticky left-0 bg-white z-10 border-r">
                          {viewMode ? (
                            <span className="text-sm truncate block" title={task.phase}>
                              {task.phase}
                            </span>
                          ) : (
                            <Tooltip
                              visible={!!errors[`task_${index}_phase`]}
                              title={errors[`task_${index}_phase`]}
                              color="red"
                            >
                              <input
                                type="text"
                                value={task.phase}
                                onChange={e => handleTaskChange(index, 'phase', e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-sm ${errors[`task_${index}_phase`]
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                  }`}
                                placeholder="Enter Phase"
                              />
                            </Tooltip>
                          )}
                        </td>

                        {/* Task */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {viewMode ? (
                            <span className="text-sm truncate block" title={task.task}>
                              {task.task}
                            </span>
                          ) : (
                            <Tooltip
                              visible={!!errors[`task_${index}_task`]}
                              title={errors[`task_${index}_task`]}
                              color="red"
                            >
                              <input
                                type="text"
                                value={task.task}
                                onChange={e =>
                                  handleTaskChange(index, 'task', e.target.value)
                                }
                                className={`w-full border rounded px-2 py-1 text-sm ${errors[`task_${index}_task`]
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                  }`}
                                placeholder="Task description"
                                maxLength={250}
                              />
                            </Tooltip>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {viewMode ? (
                            <span className="text-sm">{task.duration || 0} days</span>
                          ) : (
                            <Tooltip
                              visible={!!errors[`task_${index}_duration`]}
                              title={errors[`task_${index}_duration`]}
                              color="red"
                            >
                              <div className="relative flex items-center">
                                <InputNumber
                                  min={0}
                                  value={task.duration || 0}
                                  onChange={value =>
                                    handleTaskChange(index, 'duration', value)
                                  }
                                  style={{ width: 70 }}
                                  className={
                                    errors[`task_${index}_duration`]
                                      ? 'border-red-300'
                                      : 'border-gray-300'
                                  }
                                  size="small"
                                />
                                {flexibilityAdded > 0 && (
                                  <Tag className="ml-1 text-xs" color="green">
                                    +{flexibilityAdded}
                                  </Tag>
                                )}
                              </div>
                            </Tooltip>
                          )}
                        </td>

                        {/* Responsible */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {viewMode ? (
                            <span
                              className="text-sm truncate block"
                              title={task.responsiblePerson}
                            >
                              {task.responsiblePerson}
                            </span>
                          ) : (
                            <Tooltip
                              visible={!!errors[`task_${index}_responsiblePerson`]}
                              title={errors[`task_${index}_responsiblePerson`]}
                              color="red"
                            >
                              <input
                                type="text"
                                value={task.responsiblePerson}
                                onChange={e =>
                                  handleTaskChange(
                                    index,
                                    'responsiblePerson',
                                    e.target.value
                                  )
                                }
                                className={`w-full border rounded px-2 py-1 text-sm ${errors[`task_${index}_responsiblePerson`]
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                  }`}
                                placeholder="Responsible person"
                                maxLength={30}
                              />
                            </Tooltip>
                          )}
                        </td>

                        {/* Start Date */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {viewMode || index === 0 ? (
                            // View mode or first record - display as read-only text
                            <div className="text-xs text-gray-600">
                              {task.startDate
                                ? new Date(task.startDate).toLocaleDateString()
                                : '-'}
                              {index === 0 && !viewMode && (
                                <span className="block text-[10px] text-gray-400 italic mt-0.5">
                                  (Fixed)
                                </span>
                              )}
                            </div>
                          ) : (
                            // Editable date picker for non-first records
                            <div className="relative">
                              <input
                                type="date"
                                value={task.startDate || ''}
                                onChange={e => handleTaskStartDateChange(index, e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-xs ${!formData.startDate
                                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                                  }`}
                                min={formData.tasks[index - 1]?.endDate || formData.startDate}
                                disabled={!formData.startDate}
                                title={!formData.startDate ? 'Set project Start Date first' : ''}
                              />
                              {!formData.startDate && (
                                <span className="block text-[10px] text-gray-400 italic mt-0.5">
                                  Set Start Date first
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* End Date */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="text-xs text-gray-600">
                            {task.endDate
                              ? new Date(task.endDate).toLocaleDateString()
                              : '-'}
                          </div>
                        </td>

                        {/* Actions */}
                        {!viewMode && (
                          <td className="px-3 md:px-4 py-2 md:py-3 sticky right-0 bg-white z-10 border-l">
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => deleteTask(index)}
                              size="small"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {formData.tasks.length === 0 && (
                    <tr>
                      <td colSpan={viewMode ? 6 : 7} className="px-4 py-8 text-center">
                        <div className="text-gray-400">
                          <CalendarOutlined className="text-2xl mb-2" />
                          <p>No tasks added yet</p>
                          {!viewMode && (
                            <p className="text-sm mt-1">
                              {formData.startDate
                                ? 'Click "Add Task" to get started'
                                : 'Set a start date first to add tasks'}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Actions */}
          {!viewMode && (
            <div className="border-t border-gray-200 bg-white rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <Button
                  onClick={onCancel}
                  disabled={loading}
                  size={isMobile ? 'small' : 'default'}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<CheckCircleOutlined />}
                  size={isMobile ? 'small' : 'default'}
                  className="w-full sm:w-auto"
                >
                  {milestone ? 'Update Milestone' : 'Create Milestone'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Flexibility Modal */}
      <Modal
        title="Flexibility Distribution"
        open={showFlexibilityModal}
        onCancel={() => setShowFlexibilityModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowFlexibilityModal(false)}>
            Close
          </Button>
        ]}
        width={isMobile ? '90%' : 600}
      >
        {flexibilitySummary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
              <Card size="small" className="text-center">
                <div className="text-xs md:text-sm text-gray-500">Original</div>
                <div className="text-xl md:text-2xl font-bold text-blue-600">
                  {flexibilitySummary.totalOriginalDuration}d
                </div>
              </Card>
              <Card size="small" className="text-center">
                <div className="text-xs md:text-sm text-gray-500">Added</div>
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  +{flexibilitySummary.totalDaysAdded}d
                </div>
              </Card>
              <Card size="small" className="text-center">
                <div className="text-xs md:text-sm text-gray-500">New Total</div>
                <div className="text-xl md:text-2xl font-bold text-purple-600">
                  {flexibilitySummary.newTotalDuration}d
                </div>
              </Card>
            </div>

            <div className="max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-3 py-1 md:py-2 text-left text-xs font-medium text-gray-500">
                      Task
                    </th>
                    <th className="px-2 md:px-3 py-1 md:py-2 text-left text-xs font-medium text-gray-500">
                      Original
                    </th>
                    <th className="px-2 md:px-3 py-1 md:py-2 text-left text-xs font-medium text-gray-500">
                      Added
                    </th>
                    <th className="px-2 md:px-3 py-1 md:py-2 text-left text-xs font-medium text-gray-500">
                      New
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {flexibilitySummary.distribution.map((item, index) => (
                    <tr key={index}>
                      <td className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm">
                        <div
                          className="truncate max-w-[150px] md:max-w-[200px]"
                          title={item.task}
                        >
                          {item.task}
                        </div>
                      </td>
                      <td className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm text-gray-600">
                        {item.originalDuration}d
                      </td>
                      <td className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm">
                        <Tag color="green">+{item.daysAdded}d</Tag>
                      </td>
                      <td className="px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-medium text-blue-700">
                        {item.newDuration}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MilestoneForm;