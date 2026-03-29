# Activity Reporting System

Frontend: React + Vite  
Backend: Node.js + Express + MongoDB (Mongoose)

## 1. MongoDB Atlas setup

1. Create a cluster in MongoDB Atlas.
2. Create a database user and allow your IP in Network Access.
3. Copy your connection string and replace `<username>`, `<password>`, and DB name.

Example:

`mongodb+srv://<username>:<password>@<cluster>.mongodb.net/activity_system?retryWrites=true&w=majority`

## 2. Backend env

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/activity_system?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_RESET_SECRET=ADMIN-2026
```

## 3. Frontend env

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## 4. Install dependencies

Backend folder:

```bash
cd backend
npm install
```

Frontend folder:

```bash
cd frontend
npm install
```

## 5. Run the app

Start backend:

```bash
cd backend
npm run dev
```

Start frontend (new terminal):

```bash
cd frontend
npm run dev
```

## Notes

- User/admin login, report CRUD, and admin user management are backend-driven.
- Only auth session (`authToken`, `authUser`) is stored in browser localStorage.
