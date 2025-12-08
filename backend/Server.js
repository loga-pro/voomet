const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const dailyEmailScheduler = require('./services/dailyEmailScheduler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware - Configure CORS to allow your Vercel frontend
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = ['https://voomet-f56f.vercel.app', 'http://localhost:3000', 'http://localhost:3004', 'https://voomet.onrender.com','http://192.168.1.15:3004','https://voomet.vercel.app','http://192.168.1.15:5000'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept', 'Access-Control-Allow-Credentials'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Handle preflight requests explicitly
app.options('*', cors());
app.use(express.json({ limit: '50mb' })); // Increase body size limit to 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true })); // For URL-encoded data

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Initialize daily email scheduler
dailyEmailScheduler.initialize();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/quality', require('./routes/quality'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/inhouse-milestones', require('./routes/inhouseMilestones'));
app.use('/api/boq', require('./routes/boq'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/vendor-payments', require('./routes/vendorPayments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/project-budgets', require('./routes/projectBudgets'));
app.use('/api/project-expenditures', require('./routes/projectExpenditures'));
app.use('/api/logistic-expenditures', require('./routes/logisticExpenditures'));
app.use('/api/production', require('./routes/production'));
app.use('/api/purchase-requests', require('./routes/purchaseRequests'));

// Static file serving for uploads
app.use('/uploads', (req, res, next) => {
  res.header('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// File download route
app.get('/uploads/boq/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'boq', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(404).json({ message: 'File not found' });
    }
  });
});

app.use("/uploads/vendors_pdf", express.static(path.join(__dirname, "uploads/vendors_pdf")));
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Voomet API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`MongoDB URI configured: ${!!process.env.MONGODB_URI}`);
  console.log(`JWT Secret configured: ${!!process.env.JWT_SECRET}`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});
