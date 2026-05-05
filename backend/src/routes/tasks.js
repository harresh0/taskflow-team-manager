const express = require('express');
const { pool } = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Get tasks (with filters)
router.get('/', async (req, res) => {
  const { project_id, status, assignee_id } = req.query;
  try {
    let query = `
      SELECT t.*, 
        u.name as assignee_name, u.email as assignee_email,
        cb.name as created_by_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users cb ON t.created_by = cb.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (req.user.role !== 'admin') {
      query += ` AND (t.project_id IN (
        SELECT id FROM projects WHERE owner_id = $${idx}
        UNION SELECT project_id FROM project_members WHERE user_id = $${idx}
      ))`;
      params.push(req.user.id);
      idx++;
    }

    if (project_id) { query += ` AND t.project_id = $${idx++}`; params.push(project_id); }
    if (status) { query += ` AND t.status = $${idx++}`; params.push(status); }
    if (assignee_id) { query += ` AND t.assignee_id = $${idx++}`; params.push(assignee_id); }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    let projectFilter = '';
    const params = [];

    if (req.user.role !== 'admin') {
      projectFilter = `AND t.project_id IN (
        SELECT id FROM projects WHERE owner_id = $1
        UNION SELECT project_id FROM project_members WHERE user_id = $1
      )`;
      params.push(req.user.id);
    }

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'todo') as todo,
        COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE t.status = 'done') as done,
        COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status != 'done') as overdue,
        COUNT(*) as total
      FROM tasks t
      WHERE 1=1 ${projectFilter}
    `, params);

    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as assignee_name, cb.name as created_by_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users cb ON t.created_by = cb.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  const { title, description, project_id, assignee_id, priority, due_date, status } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'Title and project_id required' });

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, assignee_id, created_by, priority, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, project_id, assignee_id || null, req.user.id, priority || 'medium', due_date || null, status || 'todo']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assignee_id = $5,
        due_date = $6,
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, status, priority, assignee_id || null, due_date || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
