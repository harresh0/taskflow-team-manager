================================================================================
TASKFLOW — TEAM TASK MANAGER (Full-Stack)
Assignment Submission for Ethara.AI
================================================================================

LIVE URL: [Add your Railway URL here after deployment]
GITHUB:   [Add your GitHub repo URL here]

--------------------------------------------------------------------------------
PROJECT OVERVIEW
--------------------------------------------------------------------------------

TaskFlow is a full-stack team task management web application with role-based
access control (Admin/Member). It allows teams to create projects, assign tasks,
track progress, and manage team members — all in a clean, modern interface.

--------------------------------------------------------------------------------
TECH STACK
--------------------------------------------------------------------------------

Frontend:
  - React 18 + Vite
  - React Router v6 (client-side routing)
  - Axios (API calls)
  - React Hot Toast (notifications)
  - date-fns (date formatting)
  - Custom CSS (no UI framework — hand-crafted dark theme)

Backend:
  - Node.js + Express.js
  - PostgreSQL (via Railway managed database)
  - JSON Web Tokens (JWT) for authentication
  - bcryptjs for password hashing
  - CORS configured for frontend origin

Deployment:
  - Railway (backend + frontend + PostgreSQL)

--------------------------------------------------------------------------------
FEATURES
--------------------------------------------------------------------------------

Authentication:
  - User registration with role selection (Admin / Member)
  - Secure login with JWT tokens (7-day expiry)
  - Protected routes — unauthenticated users redirected to login
  - Persistent sessions via localStorage

Role-Based Access Control:
  Admin:
    - Create, edit, delete projects
    - Create, edit, delete tasks
    - Add/remove team members from projects
    - Manage all users (change roles, delete accounts)
    - View ALL projects and tasks across the system

  Member:
    - View only projects they are a member of
    - Create and update tasks within their projects
    - Update task status (todo → in_progress → done)
    - Cannot access the Users admin page

Projects:
  - Create projects with name and description (Admin only)
  - View all projects in a responsive card grid
  - Add/remove team members per project
  - Delete projects (cascades to tasks and memberships)

Tasks:
  - Create tasks with title, description, priority, assignee, due date, status
  - Edit any task field inline or via modal
  - Change task status with a dropdown (no page reload)
  - Filter tasks by status and project
  - Overdue detection — tasks past due date are highlighted in red
  - Table view on All Tasks page, card view on Project Detail page

Dashboard:
  - Summary stats: To Do / In Progress / Done / Overdue counts
  - Quick view of recent pending tasks
  - Quick view of recent projects
  - Personalized greeting

Users (Admin):
  - List all registered users
  - Change any user's role (Admin ↔ Member) inline
  - Delete users (with confirmation)

--------------------------------------------------------------------------------
DATABASE SCHEMA
--------------------------------------------------------------------------------

users
  id, name, email, password (hashed), role, created_at

projects
  id, name, description, owner_id → users.id, created_at

project_members
  project_id → projects.id, user_id → users.id, role

tasks
  id, title, description, status, priority, project_id → projects.id,
  assignee_id → users.id, created_by → users.id, due_date, created_at, updated_at

--------------------------------------------------------------------------------
API ENDPOINTS
--------------------------------------------------------------------------------

Auth:
  POST   /api/auth/register       Register new user
  POST   /api/auth/login          Login, returns JWT
  GET    /api/auth/me             Get current user (protected)

Projects:
  GET    /api/projects            List projects (scoped by role)
  GET    /api/projects/:id        Get project + members
  POST   /api/projects            Create project (Admin)
  PUT    /api/projects/:id        Update project (Admin)
  DELETE /api/projects/:id        Delete project (Admin)
  POST   /api/projects/:id/members        Add member (Admin)
  DELETE /api/projects/:id/members/:uid   Remove member (Admin)

Tasks:
  GET    /api/tasks               List tasks (filterable by status, project)
  GET    /api/tasks/stats         Dashboard stats
  GET    /api/tasks/:id           Get single task
  POST   /api/tasks               Create task
  PUT    /api/tasks/:id           Update task
  DELETE /api/tasks/:id           Delete task (Admin)

Users:
  GET    /api/users               List all users (Admin)
  PUT    /api/users/:id/role      Change role (Admin)
  DELETE /api/users/:id           Delete user (Admin)

--------------------------------------------------------------------------------
HOW TO RUN LOCALLY
--------------------------------------------------------------------------------

Prerequisites: Node.js 18+, PostgreSQL

1. Clone the repository:
   git clone <your-repo-url>
   cd taskmanager

2. Set up the backend:
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your DATABASE_URL and JWT_SECRET
   npm run dev

3. Set up the frontend:
   cd ../frontend
   npm install
   cp .env.example .env
   # Edit .env: VITE_API_URL=http://localhost:5000/api
   npm run dev

4. Open http://localhost:5173 in your browser.
   The database tables are auto-created on first run.

--------------------------------------------------------------------------------
HOW TO DEPLOY ON RAILWAY
--------------------------------------------------------------------------------

1. Push code to GitHub (two separate folders: /backend and /frontend)

2. Create a new Railway project at railway.app

3. Add a PostgreSQL plugin — Railway provides DATABASE_URL automatically

4. Create Backend service:
   - Connect to your GitHub repo, root directory: /backend
   - Add environment variables:
       JWT_SECRET=<random strong secret>
       NODE_ENV=production
       FRONTEND_URL=https://<your-frontend>.railway.app

5. Create Frontend service:
   - Connect to same repo, root directory: /frontend
   - Add environment variable:
       VITE_API_URL=https://<your-backend>.railway.app/api

6. Deploy both services. Railway will auto-detect and build with Nixpacks.

7. The backend /health endpoint confirms the server is running.

--------------------------------------------------------------------------------
DEMO CREDENTIALS (create via /register after deploying)
--------------------------------------------------------------------------------

  Register an Admin account first, then register Member accounts.
  The role is selected during registration.

--------------------------------------------------------------------------------
PROJECT STRUCTURE
--------------------------------------------------------------------------------

taskmanager/
├── backend/
│   ├── src/
│   │   ├── index.js              Entry point, Express setup
│   │   ├── models/
│   │   │   └── db.js             PostgreSQL pool + schema init
│   │   ├── middleware/
│   │   │   └── auth.js           JWT auth + admin guard
│   │   └── routes/
│   │       ├── auth.js           Auth endpoints
│   │       ├── projects.js       Project CRUD + members
│   │       ├── tasks.js          Task CRUD + stats
│   │       └── users.js          User management
│   ├── .env.example
│   ├── railway.json
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx              App entry
    │   ├── App.jsx               Router + route guards
    │   ├── index.css             Global styles (dark theme)
    │   ├── context/
    │   │   └── AuthContext.jsx   Auth state management
    │   ├── hooks/
    │   │   └── api.js            Axios instance + interceptors
    │   ├── components/
    │   │   └── Layout.jsx        Sidebar + navigation
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx     Stats + overview
    │       ├── Projects.jsx      Project list
    │       ├── ProjectDetail.jsx Tasks per project + members
    │       ├── Tasks.jsx         All tasks + filters
    │       └── Users.jsx         Admin user management
    ├── .env.example
    ├── railway.json
    ├── vite.config.js
    └── package.json

================================================================================
