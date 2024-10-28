import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { supabase } from './lib/supabase.js';
import { processBulkEmails } from './validators/bulkValidator.js';
import { validateSingleEmail } from './validators/emailValidator.js';
import validationRoutes from './routes/validation.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
});
app.use(limiter);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv') {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// API Routes
app.use('/api', validationRoutes);

// Single email validation endpoint
app.post('/api/validate-single', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = await validateSingleEmail(email);
    res.json(result);
  } catch (error) {
    console.error('Single email validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Bulk email validation endpoint
app.post('/api/validate-bulk', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const userEmail = req.body.userEmail;
    const userId = req.body.userId;

    if (!file || !userEmail || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await processBulkEmails(file.path, userEmail, userId);
    res.json(result);
  } catch (error) {
    console.error('Bulk validation error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Static files
app.use(express.static(path.join(__dirname, '../client')));

// Serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});