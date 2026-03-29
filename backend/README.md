# Activity System Backend

## Setup
1. Create `.env` from `.env.example`.
2. Set `MONGO_URI` to your MongoDB connection string:
   - Local MongoDB: `mongodb://127.0.0.1:27017/activity_reporting_system`
   - MongoDB Atlas: `mongodb+srv://...`
3. Install dependencies:
   - `npm install`
4. Run backend:
   - `npm run dev`

## Environment Variables
- `NODE_ENV`: use `production` in production
- `PORT`: API port (default `5000`)
- `MONGO_URI`: MongoDB Atlas URI
- `MONGO_DIRECT_URI`: optional non-SRV URI fallback (`mongodb://...`) when DNS blocks SRV lookups
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: token lifetime (default `7d`)
- `FRONTEND_URL`: one or more allowed CORS origins separated by commas
- `ADMIN_EMAIL`: seeded admin email
- `ADMIN_PASSWORD`: seeded admin password
- `ADMIN_RESET_SECRET`: secret code for admin forgot-password flow
- `ADMIN_REGISTER_CODE`: secret code for admin registration
- `UPLOAD_DIR`: local uploads directory; use persistent storage in deployment
- `TRUST_PROXY`: set to `true` behind a reverse proxy/platform load balancer
- `JSON_BODY_LIMIT`: JSON request size limit
- `AUTH_RATE_LIMIT_WINDOW_MS`: auth rate limit window in milliseconds
- `AUTH_RATE_LIMIT_MAX`: max auth requests per IP in that window

## Production Notes
- In `NODE_ENV=production`, the backend refuses to start with default admin credentials/codes.
- `FRONTEND_URL` must be set to your deployed frontend origin.
- `UPLOAD_DIR` should point to persistent storage if your host has ephemeral disks.

## API Summary
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/reports`
- `POST /api/reports`
- `PATCH /api/reports/:id`
- `DELETE /api/reports/:id`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/stats`
- `GET /api/admin/reports?status=pending|reviewed`
- `PATCH /api/admin/reports/:id/review`
