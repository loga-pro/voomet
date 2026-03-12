const nodemailer = require('nodemailer');
const User = require('../models/User');
require('dotenv').config();

const smtpConfig = {
  host: process.env.EMAIL_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
};

if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('zoho')) {
  smtpConfig.secure = false;
  smtpConfig.requireTLS = true;
}

const transporter = nodemailer.createTransport(smtpConfig);

/**
 * Get all admin users' emails
 */
async function getAdminEmails() {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email name');
    return adminUsers.map(user => ({
      email: user.email,
      name: user.name
    }));
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Send email to all admins
 */
async function sendToAdmins(mailOptions) {
  try {
    const admins = await getAdminEmails();
    
    if (admins.length === 0) {
      console.warn('No admin users found to send email');
      return { success: false, message: 'No admin users found' };
    }

    const adminEmails = admins.map(admin => admin.email).join(', ');
    
    const finalMailOptions = {
      ...mailOptions,
      from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
      to: adminEmails
    };

    const info = await transporter.sendMail(finalMailOptions);
    console.log('✅ Email sent to admins:', info.messageId);
    return { success: true, info, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email to admins:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Format action type for display
 */
function formatAction(action) {
  const actionMap = {
    'create': ' Created',
    'update': ' Updated',
    'delete': ' Deleted'
  };
  return actionMap[action] || action;
}

/**
 * Format date for display
 */
function formatDate(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format field name for display (convert camelCase to Title Case)
 */
function formatFieldName(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Format value for display
 */
function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return formatDate(value);
  if (Array.isArray(value)) return value.length > 0 ? `${value.length} items` : 'None';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Generate before/after comparison HTML for update operations
 */
/**
 * Generate detailed changes for an array of objects
 */
function getDetailedArrayChanges(oldArr, newArr) {
  if (!Array.isArray(oldArr) || !Array.isArray(newArr)) return '';
  
  const changes = [];
  
  // Try to find a good identifier for the items
  const getIdentifier = (item) => {
    if (!item) return null;
    return item._id?.toString() || item.task || item.partName || item.itemName || item.phase || item.description || item.code;
  };

  const getName = (item) => {
    if (!item) return 'Unknown';
    return item.task || item.partName || item.itemName || item.phase || item.description || item.code || item.name || 'Item';
  };

  const oldMap = new Map();
  oldArr.forEach(item => {
    const id = getIdentifier(item);
    if (id) oldMap.set(id, item);
  });

  const newMap = new Map();
  newArr.forEach(item => {
    const id = getIdentifier(item);
    if (id) newMap.set(id, item);
  });

  // Watch these fields for changes
  const watchFields = [
    'status', 'completion', 'quantity', 'rate', 'totalValue', 'total', 
    'remarks', 'remark', 'percentage', 'startDate', 'endDate',
    'actualStartDate', 'actualEndDate', 'outlookCompletion', 'responsiblePerson',
    'actualProduction', 'productionQuantityPlan', 'gap', 'reasonForDelay', 'specification',
    'unitType', 'thickness', 'area', 'code'
  ];

  // Find updated and removed
  for (const [id, oldItem] of oldMap) {
    const newItem = newMap.get(id);
    if (!newItem) {
      changes.push(`<span style="color: #d32f2f;">❌ Removed: ${getName(oldItem)}</span>`);
    } else {
      const itemChanges = [];
      
      watchFields.forEach(f => {
        if (!(f in oldItem) && !(f in newItem)) return;

        const oldVal = oldItem[f];
        const newVal = newItem[f];
        
        // Skip if both are non-existent or null/undefined
        if ((oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)) return;

        // Compare values
        const oldStr = JSON.stringify(oldVal);
        const newStr = JSON.stringify(newVal);

        if (oldStr !== newStr) {
          const displayOld = formatValue(oldVal);
          const displayNew = formatValue(newVal);
          itemChanges.push(`<strong>${formatFieldName(f)}:</strong> ${displayOld} → ${displayNew}`);
        }
      });
      
      if (itemChanges.length > 0) {
        changes.push(`<span style="color: #1976d2;">📝 Modified ${getName(oldItem)}:</span><br/>&nbsp;&nbsp;&nbsp;&nbsp;${itemChanges.join(', ')}`);
      }
    }
  }

  // Find added
  for (const [id, newItem] of newMap) {
    if (!oldMap.has(id)) {
      changes.push(`<span style="color: #388e3c;">➕ Added: ${getName(newItem)}</span>`);
    }
  }

  if (changes.length === 0) return '';
  
  return `
    <div style="font-size: 11px; margin-top: 8px; border-top: 1px dashed #e0e0e0; padding-top: 8px; line-height: 1.5; color: #444;">
      ${changes.join('<br/>')}
    </div>
  `;
}

/**
 * Generate before/after comparison HTML for update operations
 */
function generateBeforeAfterComparison(oldData, newData, excludeFields = ['_id', '__v', 'createdAt', 'updatedAt']) {
  const changes = [];
  
  // Handle mongoose documents by converting to plain objects
  const normalizedOld = (oldData && typeof oldData.toObject === 'function') ? oldData.toObject() : (oldData || {});
  const normalizedNew = (newData && typeof newData.toObject === 'function') ? newData.toObject() : (newData || {});

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(normalizedOld), ...Object.keys(normalizedNew)]);
  
  allKeys.forEach(key => {
    // Skip excluded fields
    if (excludeFields.includes(key)) return;
    
    const oldValue = normalizedOld[key];
    const newValue = normalizedNew[key];
    
    // Check if values are different
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);
    
    if (oldStr !== newStr) {
      let beforeText = formatValue(oldValue);
      let afterText = formatValue(newValue);

      // Special handling for arrays of objects to show WHAT changed
      const firstItem = (Array.isArray(oldValue) && oldValue[0]) || (Array.isArray(newValue) && newValue[0]);
      if (Array.isArray(oldValue) && Array.isArray(newValue) && firstItem && typeof firstItem === 'object') {
        const detailChanges = getDetailedArrayChanges(oldValue, newValue);
        if (detailChanges) {
          afterText = `<strong>${newValue.length} items</strong>${detailChanges}`;
        }
      }

      changes.push({
        field: formatFieldName(key),
        before: beforeText,
        after: afterText
      });
    }
  });
  
  if (changes.length === 0) {
    return `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
        <p style="color: #856404; margin: 0;">No changes detected in the data.</p>
      </div>
    `;
  }
  
  return `
    <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800;">
      <h3 style="color: #333; margin-top: 0;">📊 Changes Made (${changes.length})</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0; color: #555; font-weight: 600;">Field</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0; color: #555; font-weight: 600; background-color: #ffebee;">Before</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0; color: #555; font-weight: 600; background-color: #e8f5e9;">After</th>
          </tr>
        </thead>
        <tbody>
          ${changes.map(change => `
            <tr>
              <td style="padding: 12px; border: 1px solid #e0e0e0; color: #333; font-weight: 500;">${change.field}</td>
              <td style="padding: 12px; border: 1px solid #e0e0e0; color: #666; background-color: #ffebee;">${change.before}</td>
              <td style="padding: 12px; border: 1px solid #e0e0e0; color: #666; background-color: #e8f5e9;">${change.after}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Send Milestone notification to admins
 */
async function sendMilestoneNotification(action, milestoneData, userName, oldData = null) {
  const actionText = formatAction(action);
  const timestamp = formatDate(new Date());

  // Generate content based on action type
  let contentSection = '';
  
  if (action === 'update' && oldData) {
    // Show before/after comparison for updates
    contentSection = generateBeforeAfterComparison(oldData, milestoneData);
  } else {
    // Show current data for create/delete operations
    contentSection = `
      <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #764ba2;">
        <h3 style="color: #333; margin-top: 0;">Milestone Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Customer:</strong></td>
            <td style="padding: 8px 0; color: #333;">${milestoneData.customer || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Project Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${milestoneData.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Start Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">${milestoneData.startDate ? formatDate(milestoneData.startDate) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>End Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">${milestoneData.endDate ? formatDate(milestoneData.endDate) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Total Tasks:</strong></td>
            <td style="padding: 8px 0; color: #333;">${milestoneData.tasks ? milestoneData.tasks.length : 0}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const mailOptions = {
    subject: `${actionText} Milestone - ${milestoneData.customer} - ${milestoneData.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">📋 Milestone ${action.toUpperCase()}</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Action Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Action:</strong></td>
                <td style="padding: 8px 0; color: #333;">${actionText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Performed By:</strong></td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${contentSection}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; font-size: 12px; margin: 0;">
              This is an automated notification from Voomet Management System.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendToAdmins(mailOptions);
}

/**
 * Send Inventory notification to admins
 */
async function sendInventoryNotification(action, inventoryData, userName, oldData = null) {
  const actionText = formatAction(action);
  const timestamp = formatDate(new Date());

  // Generate content based on action type
  let contentSection = '';
  
  if (action === 'update' && oldData) {
    contentSection = generateBeforeAfterComparison(oldData, inventoryData);
  } else {
    contentSection = `
      <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #38ef7d;">
        <h3 style="color: #333; margin-top: 0;">Inventory Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Part Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${inventoryData.partName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Scope of Work:</strong></td>
            <td style="padding: 8px 0; color: #333;">${inventoryData.scopeOfWork || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Stock at Factory:</strong></td>
            <td style="padding: 8px 0; color: #333;">${inventoryData.stockAtFactory || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Stock Value:</strong></td>
            <td style="padding: 8px 0; color: #333;">₹${inventoryData.totalValue ? inventoryData.totalValue.toLocaleString('en-IN') : '0'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Reorder Level:</strong></td>
            <td style="padding: 8px 0; color: #333;">${inventoryData.reOrderLevel || 'N/A'}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const mailOptions = {
    subject: `${actionText} Inventory - ${inventoryData.partName || 'Item'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">📦 Inventory ${action.toUpperCase()}</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #11998e;">
            <h3 style="color: #333; margin-top: 0;">Action Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Action:</strong></td>
                <td style="padding: 8px 0; color: #333;">${actionText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Performed By:</strong></td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${contentSection}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; font-size: 12px; margin: 0;">
              This is an automated notification from Voomet Management System.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendToAdmins(mailOptions);
}

/**
 * Send Quality notification to admins
 */
async function sendQualityNotification(action, qualityData, userName, oldData = null) {
  const actionText = formatAction(action);
  const timestamp = formatDate(new Date());

  // Generate content based on action type
  let contentSection = '';
  
  if (action === 'update' && oldData) {
    contentSection = generateBeforeAfterComparison(oldData, qualityData);
  } else {
    contentSection = `
      <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f5576c;">
        <h3 style="color: #333; margin-top: 0;">Quality Issue Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Project Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${qualityData.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Issue Type:</strong></td>
            <td style="padding: 8px 0; color: #333;">${qualityData.issueType || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Severity:</strong></td>
            <td style="padding: 8px 0; color: #333;">${qualityData.severity || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; color: #333;">${qualityData.status || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Description:</strong></td>
            <td style="padding: 8px 0; color: #333;">${qualityData.description || 'N/A'}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const mailOptions = {
    subject: `${actionText} Quality Issue - ${qualityData.projectName || 'Project'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">🔍 Quality ${action.toUpperCase()}</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f093fb;">
            <h3 style="color: #333; margin-top: 0;">Action Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Action:</strong></td>
                <td style="padding: 8px 0; color: #333;">${actionText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Performed By:</strong></td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${contentSection}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; font-size: 12px; margin: 0;">
              This is an automated notification from Voomet Management System.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendToAdmins(mailOptions);
}

/**
 * Send Production notification to admins
 */
async function sendProductionNotification(action, productionData, userName, oldData = null) {
  const actionText = formatAction(action);
  const timestamp = formatDate(new Date());

  // Generate content based on action type
  let contentSection = '';
  
  if (action === 'update' && oldData) {
    contentSection = generateBeforeAfterComparison(oldData, productionData);
  } else {
    contentSection = `
      <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #00f2fe;">
        <h3 style="color: #333; margin-top: 0;">Production Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Part Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${productionData.partName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Quantity:</strong></td>
            <td style="padding: 8px 0; color: #333;">${productionData.quantity || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Production Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">${productionData.productionDate ? formatDate(productionData.productionDate) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; color: #333;">${productionData.status || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Remarks:</strong></td>
            <td style="padding: 8px 0; color: #333;">${productionData.remarks || 'N/A'}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const mailOptions = {
    subject: `${actionText} Production - ${productionData.partName || 'Item'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">🏭 Production ${action.toUpperCase()}</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4facfe;">
            <h3 style="color: #333; margin-top: 0;">Action Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Action:</strong></td>
                <td style="padding: 8px 0; color: #333;">${actionText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Performed By:</strong></td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${contentSection}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; font-size: 12px; margin: 0;">
              This is an automated notification from Voomet Management System.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendToAdmins(mailOptions);
}

/**
 * Send Purchase Order notification to admins
 */
async function sendPurchaseOrderNotification(action, purchaseData, userName, oldData = null) {
  const actionText = formatAction(action);
  const timestamp = formatDate(new Date());

  // Generate content based on action type
  let contentSection = '';
  
  if (action === 'update' && oldData) {
    contentSection = generateBeforeAfterComparison(oldData, purchaseData);
  } else {
    contentSection = `
      <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #fee140;">
        <h3 style="color: #333; margin-top: 0;">Purchase Order Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Voucher No:</strong></td>
            <td style="padding: 8px 0; color: #333;">${purchaseData.voucherNo || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Vendor Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${purchaseData.vendorName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Part Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${purchaseData.partName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Work Category:</strong></td>
            <td style="padding: 8px 0; color: #333;">${purchaseData.workCategory || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Quantity:</strong></td>
            <td style="padding: 8px 0; color: #333;">${purchaseData.quantity || 0} ${purchaseData.unit || ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Total Value:</strong></td>
            <td style="padding: 8px 0; color: #333;">₹${purchaseData.totalValue ? purchaseData.totalValue.toLocaleString('en-IN') : '0'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">${purchaseData.date ? formatDate(purchaseData.date) : 'N/A'}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const mailOptions = {
    subject: `${actionText} Purchase Order - ${purchaseData.voucherNo || 'PO'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0; font-size: 24px;">🛒 Purchase Order ${action.toUpperCase()}</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #fa709a;">
            <h3 style="color: #333; margin-top: 0;">Action Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Action:</strong></td>
                <td style="padding: 8px 0; color: #333;">${actionText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Performed By:</strong></td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${contentSection}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; font-size: 12px; margin: 0;">
              This is an automated notification from Voomet Management System.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendToAdmins(mailOptions);
}

/**
 * Send Purchase Requisition notification to admins
 */
async function sendPurchaseRequisitionNotification(action, requisitionData, userName, oldData = null) {
  const actionText = formatAction(action);
  const timestamp = formatDate(new Date());

  // Generate content based on action type
  let contentSection = '';
  
  if (action === 'update' && oldData) {
    contentSection = generateBeforeAfterComparison(oldData, requisitionData);
  } else {
    contentSection = `
      <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #fed6e3;">
        <h3 style="color: #333; margin-top: 0;">Purchase Requisition Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Customer Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.customerName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Project Name:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Start Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.startDate ? formatDate(requisitionData.startDate) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>End Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.endDate ? formatDate(requisitionData.endDate) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Total Items:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.totalItems || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Total Quantity:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.totalQuantity || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; color: #333;">${requisitionData.status || 'Pending'}</td>
          </tr>
        </table>
      </div>
    `;
  }

  const mailOptions = {
    subject: `${actionText} Purchase Requisition - ${requisitionData.customerName || 'Customer'} - ${requisitionData.projectName || 'Project'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="color: #333; margin: 0; font-size: 24px;">📝 Purchase Requisition ${action.toUpperCase()}</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #a8edea;">
            <h3 style="color: #333; margin-top: 0;">Action Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 150px;"><strong>Action:</strong></td>
                <td style="padding: 8px 0; color: #333;">${actionText}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Performed By:</strong></td>
                <td style="padding: 8px 0; color: #333;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Date & Time:</strong></td>
                <td style="padding: 8px 0; color: #333;">${timestamp}</td>
              </tr>
            </table>
          </div>

          ${contentSection}

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; font-size: 12px; margin: 0;">
              This is an automated notification from Voomet Management System.
            </p>
          </div>
        </div>
      </div>
    `
  };

  return await sendToAdmins(mailOptions);
}

module.exports = {
  sendMilestoneNotification,
  sendInventoryNotification,
  sendQualityNotification,
  sendProductionNotification,
  sendPurchaseOrderNotification,
  sendPurchaseRequisitionNotification,
  getAdminEmails
};
