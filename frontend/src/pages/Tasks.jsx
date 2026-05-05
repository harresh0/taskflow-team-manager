import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api from '../hooks/api'
import { format, isPast } from 'date-fns'

export default function Tasks() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', project_id: '' })
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', project_id: '', assignee_id: '', priority: 'medium', due_date: '', status: 'todo' })
  const [projectMembers, setProjectMembers] = useState([])
  const [saving, setSaving] = useState(false)

  const loadTasks = () => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.project_id) params.append('project_id', filters.project_id)
    return api.get(`/tasks?${params}`).then(r => setTasks(r.data))
  }

  useEffect(() => {
    Promise.all([loadTasks(), api.get('/projects').then(r => setProjects(r.data))])
      .finally(() => setLoading(false))
  }, [filters])

  const handleProjectChange = async (projectId) => {
    setForm(f => ({ ...f, project_id: projectId, assignee_id: '' }))
    if (projectId) {
      const r = await api.get(`/projects/${projectId}`)
      setProjectMembers(r.data.members || [])
    } else {
      setProjectMembers([])
    }
  }

  const openCreate = () => {
    setEditTask(null)
    setForm({ title: '', description: '', project_id: '', assignee_id: '', priority: 'medium', due_date: '', status: 'todo' })
    setProjectMembers([])
    setShowModal(true)
  }

  const openEdit = async (task) => {
    setEditTask(task)
    setForm({
      title: task.title,
      description: task.description || '',
      project_id: task.project_id,
      assignee_id: task.assignee_id || '',
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      status: task.status
    })
    if (task.project_id) {
      const r = await api.get(`/projects/${task.project_id}`)
      setProjectMembers(r.data.members || [])
    }
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null }
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, payload)
        toast.success('Task updated!')
      } else {
        await api.post('/tasks', payload)
        toast.success('Task created!')
      }
      setShowModal(false)
      loadTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${id}`)
      toast.success('Task deleted')
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header-row page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
      </div>

      <div className="filters-bar">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select value={filters.project_id} onChange={e => setFilters(f => ({ ...f, project_id: e.target.value }))}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <h3>No tasks found</h3>
          <p style={{ marginTop: 6 }}>Try changing filters or create a new task.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td>
                      <span style={{ cursor: 'pointer', color: 'var(--accent2)' }} onClick={() => navigate(`/projects/${task.project_id}`)}>
                        {task.project_name}
                      </span>
                    </td>
                    <td>{task.assignee_name || <span className="text-muted">—</span>}</td>
                    <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                    <td>
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '4px 8px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td>
                      {task.due_date ? (
                        <span className={`badge ${isPast(new Date(task.due_date)) && task.status !== 'done' ? 'badge-overdue' : 'badge-todo'}`}>
                          {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(task)}>Edit</button>
                        {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(task.id)}>Del</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="Task title" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Project *</label>
                <select className="form-input" value={form.project_id} onChange={e => handleProjectChange(e.target.value)} required>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="form-input" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {projectMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editTask ? 'Update' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
