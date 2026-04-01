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

## Thunder Client demo for evaluator

Thunder Client import files are available in:

- `thunder-client/activity-system-evaluator-collection.json`
- `thunder-client/activity-system-evaluator-environment.json`

### Import steps

1. Open VS Code.
2. Open Thunder Client.
3. Import the collection file.
4. Import the environment file.
5. Select the imported environment before sending requests.

### Update environment values

Set these values in the imported environment:

- `baseUrl`: `http://localhost:5000` for local backend or your deployed backend URL
- `today`: current date in `YYYY-MM-DD` format
- `adminEmail`: value from `backend/.env`
- `adminPassword`: value from `backend/.env`

After login requests:

- Copy the `token` from `Login User` into `userToken`
- Copy the `token` from `Login Admin` into `adminToken`
- Copy the created report `id` into `reportId`
- Copy the created event report `id` into `eventReportId`

### Suggested evaluator flow

Use this order to demonstrate the evaluation metrics clearly:

1. `Health Check`
2. `Register User`
3. `Login User`
4. `Get Current User`
5. `Create Activity Report`
6. `Create Event Report`
7. `List User Reports`
8. `Filter Reports`
9. `Mark Report Completed`
10. `Submit Report For Review`
11. `Upload Event Attachment`
12. `Login Admin`
13. `Admin Dashboard Stats`
14. `Admin List Users`
15. `Admin Pending Reports`
16. `Admin Approve Report`

### What each request proves

- `Health Check`: production readiness and backend availability
- `Register User` and `Login User`: authentication flow
- `Get Current User`: JWT-protected route
- `Create Activity Report`: report creation logic
- `Create Event Report`: event workflow support
- `List User Reports` and `Filter Reports`: search/filter backend capability
- `Mark Report Completed` and `Submit Report For Review`: status lifecycle and approval flow
- `Upload Event Attachment`: file upload support for event reports
- `Admin Dashboard Stats` and `Admin List Users`: admin analytics and user management
- `Admin Pending Reports` and `Admin Approve Report`: admin review workflow

### Expected response highlights

- `Login User` and `Login Admin` return:
  - `token`
  - `user.role`
  - `user.email`
- `Create Activity Report` returns:
  - `report.id`
  - `report.activity`
  - `report.status`
- `Create Event Report` returns:
  - `report.id`
  - `report.reportType = "event"`
- `List User Reports` returns:
  - `reports[]`
- `Admin Dashboard Stats` returns:
  - `totalUsers`
  - `totalActivities`
  - `submittedReports`
  - `archivedDeletedUserReports`
- `Admin Approve Report` returns:
  - `report.reviewStatus = "approved"`
  - `report.adminComment`
  - `report.reviewSuggestion`

### Manual note for file upload

For `Upload Event Attachment`, choose a file manually in Thunder Client because file paths are machine-specific. Supported files include images, PDF, DOC, and DOCX.
