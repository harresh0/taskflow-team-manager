import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import api from '../hooks/api'
import { format, isPast } from 'date-fns'

export default function ProjectDetail() {
  const { id } = useParams()
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', status: 'todo' })
  const [memberUserId, setMemberUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const loadProject = () => api.get(`/projects/${id}`).then(r => setProject(r.data))
  const loadTasks = () => api.get(`/tasks?project_id=${id}`).then(r => setTasks(r.data))

  useEffect(() => {
    Promise.all([loadProject(), loadTasks(), isAdmin ? api.get('/users').then(r => setAllUsers(r.data)) : Promise.resolve()])
      .finally(() => setLoading(false))
  }, [id])

  const openCreateTask = () => {
    setEditTask(null)
    setTaskForm({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '', status: 'todo' })
    setShowTaskModal(true)
  }

  const openEditTask = (task) => {
    setEditTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee_id: task.assignee_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      status: task.status
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...taskForm, project_id: id, assignee_id: taskForm.assignee_id || null, due_date: taskForm.due_date || null }
      if (editTask) {
        await api.put(`/tasks/${editTask.id}`, payload)
        toast.success('Task updated!')
      } else {
        await api.post('/tasks', payload)
        toast.success('Task created!')
      }
      setShowTaskModal(false)
      loadTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      toast.success('Task deleted')
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      toast.error('Failed to delete task')
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!memberUserId) return
    setSaving(true)
    try {
      await api.post(`/projects/${id}/members`, { user_id: memberUserId })
      toast.success('Member added!')
      setShowMemberModal(false)
      setMemberUserId('')
      loadProject()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(`/projects/${id}/members/${userId}`)
      toast.success('Member removed')
      loadProject()
    } catch (err) {
      toast.error('Failed to remove member')
    }
  }

  if (loading) return <div className="loading"><div className="spinner"></div></div>
  if (!project) return <div className="empty-state"><h3>Project not found</h3></div>

  const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks
  const memberIds = project.members?.map(m => m.id) || []
  const nonMembers = allUsers.filter(u => !memberIds.includes(u.id))

  return (
    <div>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 12 }}>← Back</button>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            {isAdmin && <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}>+ Add Member</button>}
            <button className="btn btn-primary" onClick={openCreateTask}>+ Add Task</button>
          </div>
        </div>
      </div>

      {/* Members */}
      {project.members?.length > 0 && (
        <div className="card mb-4" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-head)', marginBottom: 10, fontSize: 14 }}>Team Members</div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {project.members.map(m => (
              <div key={m.id} className="flex items-center gap-2" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px 4px 4px' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                  {m.name[0]}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{m.name}</span>
                <span className={`badge badge-${m.role}`}>{m.role}</span>
                {isAdmin && m.id !== user.id && (
                  <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <span className="text-muted" style={{ display: 'flex', alignItems: 'center' }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tasks */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No tasks yet</h3>
          <p style={{ marginTop: 6 }}>Add your first task to get started.</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {filtered.map(task => (
            <div key={task.id} className="task-card">
              <div className="task-card-body">
                <div className="flex justify-between items-center">
                  <div className="task-title">{task.title}</div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditTask(task)}>Edit</button>
                    {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>Delete</button>}
                  </div>
                </div>
                {task.description && <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{task.description}</p>}
                <div className="task-meta" style={{ marginTop: 8 }}>
                  <select
                    value={task.status}
                    onChange={e => handleStatusChange(task.id, e.target.value)}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', padding: '3px 8px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  {task.assignee_name && <span style={{ fontSize: 12, color: 'var(--text3)' }}>👤 {task.assignee_name}</span>}
                  {task.due_date && (
                    <span className={`badge ${isPast(new Date(task.due_date)) && task.status !== 'done' ? 'badge-overdue' : 'badge-todo'}`}>
                      📅 {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editTask ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="Task title" value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} placeholder="Details..." value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="form-input" value={taskForm.assignee_id} onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editTask ? 'Update Task' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Team Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">Select User</label>
                <select className="form-input" value={memberUserId} onChange={e => setMemberUserId(e.target.value)} required>
                  <option value="">Choose a user...</option>
                  {nonMembers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              {nonMembers.length === 0 && <p className="text-muted">All users are already members.</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !memberUserId}>{saving ? 'Adding...' : 'Add Member'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
