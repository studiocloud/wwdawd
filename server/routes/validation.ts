import express from 'express';
import { memoryStore } from '../utils/memoryStore.js';

const router = express.Router();

router.get('/validation-history', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId || typeof userId !== 'string') {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const records = memoryStore.getRecords(userId);
    
    // Sort by date descending
    const sortedRecords = records.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(sortedRecords);
  } catch (error) {
    console.error('Validation history error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;