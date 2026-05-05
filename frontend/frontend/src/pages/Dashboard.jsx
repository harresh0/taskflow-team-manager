import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../hooks/api'
import { format, isPast } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/tasks/stats'),
      api.get('/tasks?status=todo'),
      api.get('/projects')
    ]).then(([statsRes, tasksRes, projectsRes]) => {
      setStats(statsRes.data)
      setTasks(tasksRes.data.slice(0, 5))
      setProjects(projectsRes.data.slice(0, 4))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's happening with your projects today.</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card todo">
            <div className="stat-number">{stats.todo}</div>
            <div className="stat-label">To Do</div>
          </div>
          <div className="stat-card inprogress">
            <div className="stat-number">{stats.in_progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card done">
            <div className="stat-number">{stats.done}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card overdue">
            <div className="stat-number">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>Recent Tasks</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3>No pending tasks</h3>
            </div>
          ) : (
            <div className="tasks-grid">
              {tasks.map(task => (
                <div key={task.id} className="task-card" onClick={() => navigate('/tasks')}>
                  <div className="task-card-body">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className="task-project">{task.project_name}</span>
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                      {task.due_date && (
                        <span className={`badge ${isPast(new Date(task.due_date)) ? 'badge-overdue' : 'badge-todo'}`}>
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 }}>Projects</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>View all</button>
          </div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <h3>No projects yet</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {projects.map(p => (
                <div key={p.id} className="card card-sm" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <div className="project-name" style={{ fontSize: 15 }}>{p.name}</div>
                  <div className="project-meta" style={{ marginTop: 8 }}>
                    <span className="project-meta-item">📋 {p.task_count} tasks</span>
                    <span className="project-meta-item">👥 {p.member_count} members</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
