import React, { useState, useEffect } from 'react';
import { projectsAPI, milestonesAPI, inhouseMilestonesAPI, customersAPI, reportsAPI, employeesAPI, vendorsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import { Tooltip, Modal, Button, Alert, Card, InputNumber, Slider, Tag, message } from 'antd';
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
import { useLocation, useNavigate } from 'react-router-dom';
import useNotification from '../../hooks/useNotification';
import Notification from '../Notifications/Notification';

const InhouseMilestoneForm = ({ viewMode = false, milestone: milestoneProp, onSuccess }) => {
  const navigate = useNavigate();
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const location = useLocation();
  const milestone = milestoneProp || location.state?.milestone; // Use prop first, then location.state
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
    category: 'inhouse',
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
  const [employees, setEmployees] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
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
        const formattedTasks = milestone.tasks ? milestone.tasks.map(task => ({
          ...task,
          startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
          endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
          originalDuration: task.duration || 0
        })) : [];

        setFormData({
          customer: milestone.customer || '',
          projectName: milestone.projectName || '',
          startDate: milestone.startDate ? new Date(milestone.startDate).toISOString().split('T')[0] : '',
          endDate: milestone.endDate ? new Date(milestone.endDate).toISOString().split('T')[0] : '',
          emailId: milestone.emailId || '',
          category: milestone.category || 'inhouse',
          tasks: formattedTasks,
          flexibilityPercentage: milestone.flexibilityPercentage || 0
        });

        if (milestone.endDate) {
          setOriginalEndDate(new Date(milestone.endDate).toISOString().split('T')[0]);
        }

        setOriginalTasks(formattedTasks.map(task => ({
          ...task,
          originalDuration: task.duration || 0
        })));

        calculateTotalDuration(formattedTasks);
      } else {
        initializeDefaultTasks();
      }
    };

    initializeForm();
  }, [milestone, dataLoaded]);

  // Fetch employees and vendors
  useEffect(() => {
    const fetchEmployeesAndVendors = async () => {
      try {
        const [employeesResponse, vendorsResponse] = await Promise.all([
          employeesAPI.getAll(),
          vendorsAPI.getAll()
        ]);

        setEmployees(employeesResponse.data || []);
        setVendors(vendorsResponse.data || []);
      } catch (error) {
        console.error('Error fetching employees and vendors:', error);
      }
    };

    fetchEmployeesAndVendors();
  }, []);

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

            if (milestone && milestone._id && milestone.isInhouseEdit !== false) {
              try {
                const updateData = { ...milestone, emailId: currentEmail };
                await inhouseMilestonesAPI.update(milestone._id, updateData);


              } catch (saveError) {
                console.error('Error auto-saving synced email:', saveError);
                if (milestone.isInhouseEdit !== false) {
                  setFormData(prev => ({
                    ...prev,
                    emailId: formData.emailId
                  }));
                }
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
  }, [formData.customer, viewMode, formData.emailId, milestone]);

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

      const projectPromises = stages.map(async (stage) => {
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

      const uniqueProjects = allProjects.filter((project, index, self) =>
        index === self.findIndex(p => p.projectName === project.projectName)
      );

      setProjects(uniqueProjects);
      setFilteredProjects(uniqueProjects);

      const customerNames = [...new Set(allProjects.map(project => project.customerName).filter(Boolean))];

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

  const fetchCustomerEmail = async (customerName) => {
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
      { phase: 'Project Initiation', task: 'Client meeting & requirement gathering', duration: 2, responsiblePerson: 'Project Manager', category: 'inhouse', originalDuration: 2 },
      { phase: 'Project Initiation', task: 'Site visit & measurements', duration: 1, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 1 },
      { phase: 'Concept Design', task: 'Mood board preparation', duration: 3, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 3 },
      { phase: 'Concept Design', task: 'Initial layout plan', duration: 4, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 4 },
      { phase: 'Concept Design', task: 'Client presentation & feedback', duration: 2, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 2 },
      { phase: 'Design Development', task: '3D renders & walkthrough', duration: 7, responsiblePerson: '3D Artist', category: 'inhouse', originalDuration: 7 },
      { phase: 'Design Development', task: 'Material selection & samples', duration: 5, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 5 },
      { phase: 'Design Development', task: 'Cost estimation & BOQ', duration: 4, responsiblePerson: 'Estimator', category: 'inhouse', originalDuration: 4 },
      { phase: 'Approval Phase', task: 'Final client approval', duration: 2, responsiblePerson: 'Project Manager', category: 'inhouse', originalDuration: 2 },
      { phase: 'Approval Phase', task: 'Sign-off on contracts', duration: 2, responsiblePerson: 'Project Manager', category: 'inhouse', originalDuration: 2 },
      { phase: 'Execution', task: 'Site preparation & demolition', duration: 5, responsiblePerson: 'Contractor', category: 'inhouse', originalDuration: 5 },
      { phase: 'Execution', task: 'Civil works', duration: 10, responsiblePerson: 'Civil Engineer', category: 'inhouse', originalDuration: 10 },
      { phase: 'Execution', task: 'Electrical & plumbing works', duration: 8, responsiblePerson: 'MEP Team', category: 'inhouse', originalDuration: 8 },
      { phase: 'Execution', task: 'False ceiling & partitions', duration: 6, responsiblePerson: 'Contractor', category: 'inhouse', originalDuration: 6 },
      { phase: 'Execution', task: 'Flooring installation', duration: 5, responsiblePerson: 'Contractor', category: 'inhouse', originalDuration: 5 },
      { phase: 'Execution', task: 'Wall finishes & painting', duration: 6, responsiblePerson: 'Painter', category: 'inhouse', originalDuration: 6 },
      { phase: 'Execution', task: 'Carpentry works', duration: 10, responsiblePerson: 'Carpenter', category: 'inhouse', originalDuration: 10 },
      { phase: 'Execution', task: 'Lighting installation', duration: 3, responsiblePerson: 'Electrician', category: 'inhouse', originalDuration: 3 },
      { phase: 'Execution', task: 'Furniture placement', duration: 3, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 3 },
      { phase: 'Execution', task: 'Final styling & decor', duration: 2, responsiblePerson: 'Designer', category: 'inhouse', originalDuration: 2 },
      { phase: 'Handover', task: 'Final client walkthrough', duration: 1, responsiblePerson: 'Project Manager', category: 'inhouse', originalDuration: 1 },
      { phase: 'Handover', task: 'Snag list & rectifications', duration: 3, responsiblePerson: 'Contractor', category: 'inhouse', originalDuration: 3 },
      { phase: 'Handover', task: 'Final handover & documentation', duration: 1, responsiblePerson: 'Project Manager', category: 'inhouse', originalDuration: 1 }
    ];

    setFormData(prev => ({
      ...prev,
      tasks: defaultTasks
    }));

    setOriginalTasks([...defaultTasks]);
    calculateTotalDuration(defaultTasks);
  };

  const calculateTotalDuration = (tasks) => {
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

  const updateTaskDates = (startDate) => {
    const newTasks = [...formData.tasks];
    let currentStartDate = new Date(startDate);

    newTasks.forEach((task, index) => {
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

  const handleTaskChange = (index, field, value) => {
    if (field === 'phase' && value.length > 30) {
      value = value.substring(0, 30);
    } else if (field === 'task' && value.length > 30) {
      value = value.substring(0, 30);
    } else if (field === 'responsiblePerson' && value.length > 30) {
      value = value.substring(0, 30);
    }

    const newTasks = [...formData.tasks];

    if (field === 'category') {
      newTasks[index].category = value;
    } else if (field === 'duration') {
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
      updatedOriginalTasks[index] = { ...updatedOriginalTasks[index], originalDuration: parseInt(value) || 0 };
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
      category: 'inhouse',
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

  const deleteTask = (index) => {
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

          newTasks.forEach((task) => {
            if (task.duration > 0) {
              task.startDate = currentStartDate.toISOString().split('T')[0];
              task.endDate = calculateBusinessDays(currentStartDate, task.duration);

              currentStartDate = new Date(task.endDate);
              currentStartDate.setDate(currentStartDate.getDate() + 1);
            }
          });

          const lastTask = newTasks[newTasks.length - 1];
          const newEndDate = lastTask && lastTask.endDate ? lastTask.endDate : formData.endDate;
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

  // Flexibility - For Inhouse, we SUBTRACT days
  const applyFlexibility = (percentage) => {
    if (!formData.startDate || formData.tasks.length === 0) return;

    const totalOriginalDuration = originalTasks.reduce((sum, task) => sum + (task.originalDuration || task.duration || 0), 0);

    if (totalOriginalDuration === 0) {
      setFormData(prev => ({
        ...prev,
        flexibilityPercentage: percentage
      }));
      return;
    }

    const totalDaysToSubtract = Math.ceil(totalOriginalDuration * (percentage / 100));

    const updatedTasks = formData.tasks.map(task => {
      const originalTaskDuration = task.originalDuration || task.duration || 0;
      if (originalTaskDuration === 0) return task;

      const proportion = originalTaskDuration / totalOriginalDuration;
      const daysToSubtract = Math.round(proportion * totalDaysToSubtract);
      const newDuration = Math.max(1, originalTaskDuration - daysToSubtract);

      return {
        ...task,
        duration: newDuration,
        flexibilitySubtracted: daysToSubtract
      };
    });

    setFormData(prev => ({
      ...prev,
      tasks: updatedTasks,
      flexibilityPercentage: percentage
    }));

    updateTaskDatesWithFlexibility(updatedTasks);
  };

  const updateTaskDatesWithFlexibility = (tasks) => {
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

  const handleFlexibilityChange = (value) => {
    const percentage = parseInt(value) || 0;
    applyFlexibility(percentage);
  };

  const calculateFlexibilitySummary = () => {
    if (formData.flexibilityPercentage === 0 || formData.tasks.length === 0) {
      return null;
    }

    const totalOriginalDuration = originalTasks.reduce((sum, task) => sum + (task.originalDuration || 0), 0);
    const totalDaysToSubtract = Math.ceil(totalOriginalDuration * (formData.flexibilityPercentage / 100));

    const distribution = formData.tasks.map(task => {
      const originalDuration = task.originalDuration || task.duration || 0;
      if (originalDuration === 0) return null;

      const proportion = originalDuration / totalOriginalDuration;
      const daysSubtracted = Math.round(proportion * totalDaysToSubtract);
      const newDuration = Math.max(1, originalDuration - daysSubtracted);
      const actualSubtracted = originalDuration - newDuration;

      return {
        task: task.task || `Task ${task.index}`,
        originalDuration,
        daysSubtracted: actualSubtracted,
        newDuration,
        percentageDecrease: originalDuration > 0 ? ((actualSubtracted / originalDuration) * 100).toFixed(1) : '0'
      };
    }).filter(Boolean);

    const actualTotalSubtracted = distribution.reduce((sum, item) => sum + item.daysSubtracted, 0);

    return {
      totalOriginalDuration,
      totalDaysSubtracted: actualTotalSubtracted,
      distribution,
      newTotalDuration: totalOriginalDuration - actualTotalSubtracted
    };
  };

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
        }).catch(() => ({ data: { milestones: [] } })),
        inhouseMilestonesAPI.getAll({
          customer: customer,
          projectName: projectName
        }).catch(() => ({ data: { milestones: [] } }))
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

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validateForm()) return;

    const isDuplicate = await checkForDuplicate(formData.customer, formData.projectName);
    if (!milestone && isDuplicate) {
      setErrors({
        submit: 'A milestone with the same customer and project name already exists.'
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      if (milestone) {
        if (milestone.isInhouseEdit === false || !milestone._id) {
          try {
            const existingCheck = await inhouseMilestonesAPI.getAll({
              customer: formData.customer,
              projectName: formData.projectName
            });
            const existing = existingCheck.data.milestones || existingCheck.data || [];

            if (existing.length > 0) {
              const updateData = { ...formData };
              delete updateData._id;
              delete updateData.isInhouseEdit;
              response = await inhouseMilestonesAPI.update(existing[0]._id, updateData);
            } else {
              const createData = { ...formData };
              delete createData._id;
              delete createData.isInhouseEdit;
              response = await inhouseMilestonesAPI.create(createData);
            }
          } catch (checkError) {
            console.error('Error checking existing milestone:', checkError);
            const createData = { ...formData };
            delete createData._id;
            delete createData.isInhouseEdit;
            response = await inhouseMilestonesAPI.create(createData);
          }
        } else {
          const updateData = { ...formData };
          delete updateData._id;
          delete updateData.isInhouseEdit;
          response = await inhouseMilestonesAPI.update(milestone._id, updateData);
        }
      } else {
        const createData = { ...formData };
        delete createData._id;
        delete createData.isInhouseEdit;
        response = await inhouseMilestonesAPI.create(createData);
      }

      showSuccess(milestone ? 'Milestone updated successfully!' : 'Milestone created successfully!');
      setTimeout(() => onCancel(), 1500); // Delay to show success message

    } catch (error) {
      console.error('Error saving milestone:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors({ submit: errorMessage });
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const flexibilitySummary = calculateFlexibilitySummary();

  const onCancel = () => {
    if (onSuccess) {
      // Modal mode - call the success callback
      onSuccess();
    } else {
      // Standalone page mode - navigate
      navigate('/inhouse-milestone', { state: { formSuccess: true } });
    }
  };


  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      
      {/* Optional mobile header */}
      {isMobile && (
        <div className="lg:hidden p-3 border-b bg-white">
          {/* Mobile header content if needed */}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        {errors.submit && (
          <Alert
            message="Error"
            description={errors.submit}
            type="error"
            showIcon
            className="mb-3 md:mb-4 mx-3 md:mx-4 lg:mx-6 mt-3 md:mt-4 lg:mt-6"
            closable
            onClose={() => setErrors(prev => ({ ...prev, submit: null }))}
          />
        )}

        {/* Main content area - scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 lg:p-6">
          {/* Summary Information Header */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="flex flex-row flex-wrap gap-4 justify-between">
              {/* Customer */}
              <div className="min-w-[120px] flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Client Name</label>
                {milestone || viewMode ? (
                  <div className="flex items-center space-x-2">
                    <UserOutlined className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{formData.customer || '-'}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.customer}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          customer: e.target.value,
                          projectName: ''
                        }))
                      }
                      className={`w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pl-8 ${errors.customer ? 'border-red-300' : ''}`}
                      disabled={customersLoading}
                    >
                      <option value="">{customersLoading ? 'Loading...' : 'Select'}</option>
                      {customers.map(c => (
                        <option key={c.customerName} value={c.customerName}>{c.customerName}</option>
                      ))}
                    </select>
                    <UserOutlined className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                )}
                {errors.customer && !milestone && !viewMode && <p className="mt-1 text-xs text-red-600">{errors.customer}</p>}
              </div>

              {/* Project Name */}
              <div className="min-w-[120px] flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
                {milestone || viewMode ? (
                  <div className="flex items-center space-x-2">
                    <ProjectOutlined className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">{formData.projectName || '-'}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.projectName}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          projectName: e.target.value
                        }))
                      }
                      className={`w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 pl-8 ${errors.projectName ? 'border-red-300' : ''}`}
                      disabled={!formData.customer}
                    >
                      <option value="">Select</option>
                      {filteredProjects.map(p => (
                        <option key={p.projectName} value={p.projectName}>{p.projectName}</option>
                      ))}
                    </select>
                    <ProjectOutlined className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                )}
                {errors.projectName && !milestone && !viewMode && <p className="mt-1 text-xs text-red-600">{errors.projectName}</p>}
              </div>

              {/* Email ID */}
              <div className="min-w-[150px] flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Email ID</label>
                <div className="flex items-center space-x-2">
                  <MailOutlined className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 truncate" title={formData.emailId}>
                    {formData.emailId || '-'}
                  </span>
                </div>
                {errors.emailId && <p className="mt-1 text-xs text-red-600">{errors.emailId}</p>}
              </div>

              {/* Start Date */}
              <div className="min-w-[120px] flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                <div className="flex items-center space-x-2">
                  <CalendarOutlined className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">{formData.startDate || '-'}</span>
                </div>
              </div>

              {/* End Date */}
              <div className="min-w-[120px] flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                <div className="flex items-center space-x-2">
                  <CalendarOutlined className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900">{formData.endDate || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Flexibility */}
          <Card
            title={<span className="text-sm md:text-base">Project Flexibility</span>}
            size="small"
            className="shadow-sm mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs md:text-sm font-medium text-gray-700">
                    Timeline Flexibility
                  </span>
                  <Tag color="red">{formData.flexibilityPercentage}%</Tag>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={formData.flexibilityPercentage}
                  onChange={handleFlexibilityChange}
                  disabled={viewMode || !formData.startDate || formData.tasks.length === 0}
                  tooltip={{
                    formatter: value => `${value}% decrease`
                  }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Reduces project timeline by subtracting days proportionally from all tasks
                </p>
              </div>

              {flexibilitySummary && (
                <div className="flex-1 w-full">
                  <Alert
                    message="Flexibility Applied"
                    description={`${flexibilitySummary.totalDaysSubtracted} days removed from ${flexibilitySummary.distribution.length} tasks`}
                    type="warning"
                    showIcon
                    action={
                      <Button size="small" type="text" onClick={() => setShowFlexibilityModal(true)}>
                        Details
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Tasks Table Section */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  Project Tasks
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.tasks.length} tasks, {totalDuration} days total
                </p>
              </div>
              {/* Uncomment if you want the Add Task button */}
              {/* {!viewMode && (
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
              )} */}
            </div>

            <div
              className="table-container overflow-auto"
              style={{
                maxHeight: '300px'
              }}
            >
              <table className="min-w-[1000px] w-full divide-y divide-gray-200 table-fixed">
                <colgroup>
                  <col className="w-[15%]" /> {/* Phase */}
                  <col className="w-[30%]" /> {/* Task */}
                  <col className="w-[10%]" /> {/* Duration */}
                  <col className="w-[15%]" /> {/* Category */}
                  <col className="w-[12%]" /> {/* Responsible */}
                  <col className="w-[8%]" /> {/* Start Date */}
                  <col className="w-[8%]" /> {/* End Date */}
                  {!viewMode && <col className="w-[4%]" />} {/* Actions */}
                </colgroup>

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
                      Category
                    </th>
                    <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider sticky top-0 bg-gray-50 z-20">
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
                    const flexibilitySubtracted = originalDuration - task.duration;

                    return (
                      <tr
                        key={index}
                        className={
                          flexibilitySubtracted > 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
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
                              <select
                                value={task.phase}
                                disabled={true}
                                className={`w-full border rounded px-2 py-1 text-sm bg-gray-50 ${errors[`task_${index}_phase`]
                                  ? 'border-red-300'
                                  : 'border-gray-300'
                                  }`}
                              >
                                <option value="">Select Phase</option>
                                {phaseOptions.map(phase => (
                                  <option key={phase} value={phase}>
                                    {phase}
                                  </option>
                                ))}
                              </select>
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
                                readOnly={true}
                                className={`w-full border rounded px-2 py-1 text-sm bg-gray-50 ${errors[`task_${index}_task`]
                                  ? 'border-red-300'
                                  : 'border-gray-300'
                                  }`}
                                placeholder="Task description"
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
                                {flexibilitySubtracted > 0 && (
                                  <Tag className="ml-1 text-xs" color="red">
                                    -{flexibilitySubtracted}
                                  </Tag>
                                )}
                              </div>
                            </Tooltip>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          {viewMode ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${task.category === 'inhouse'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                              }`}>
                              {task.category === 'inhouse' ? 'Inhouse' : 'Outsourced'}
                            </span>
                          ) : (
                            <select
                              value={task.category || 'inhouse'}
                              onChange={(e) => handleTaskChange(index, 'category', e.target.value)}
                              className="block w-full rounded-md shadow-sm text-sm p-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="inhouse">Inhouse</option>
                              <option value="outsourced">Outsourced</option>
                            </select>
                          )}
                        </td>

                        {/* Responsible Person */}
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
                              <select
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
                              >
                                <option value="">Select Person</option>
                                {task.category === 'inhouse' ? (
                                  employees.map((employee) => (
                                    <option key={employee._id} value={employee.name}>
                                      {employee.name}
                                    </option>
                                  ))
                                ) : (
                                  vendors.map((vendor) => (
                                    <option key={vendor._id} value={vendor.vendorName}>
                                      {vendor.vendorName}
                                    </option>
                                  ))
                                )}
                              </select>
                            </Tooltip>
                          )}
                        </td>

                        {/* Start Date */}
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <div className="text-xs text-gray-600">
                            {task.startDate
                              ? new Date(task.startDate).toLocaleDateString()
                              : '-'}
                          </div>
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
                      <td colSpan={viewMode ? 7 : 8} className="px-4 py-8 text-center">
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
        </div>

        {/* Bottom Actions - Fixed at bottom */}
        {!viewMode && (
          <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <Button
                type="button"
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
                <div className="text-xs md:text-sm text-gray-500">Removed</div>
                <div className="text-xl md:text-2xl font-bold text-red-600">
                  -{flexibilitySummary.totalDaysSubtracted}d
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
                      Removed
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
                        <Tag color="red">-{item.daysSubtracted}d</Tag>
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

export default InhouseMilestoneForm;