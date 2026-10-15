# SkillBridge – Student Skill Development and Placement Management System

## 1. Introduction
SkillBridge is a full-stack web application that gives students one place to manage their technical skills, track learning progress and explore placement and internship opportunities. Without it, students juggle separate platforms for skills, job searches and application status, which makes career preparation hard to organise.

The system has student profile management, skill assessment, a placement portal, learning roadmaps and an analytics dashboard. Students organise their preparation, and placement administrators post opportunities, review applications and monitor student progress.

**Tech stack:** React + Vite (frontend) · Node.js + Express.js (backend) · MongoDB Atlas (database).

## 2. React + Vite frontend (`client/`)
- Single-page app with React Router: Login/Register, Dashboard, Skill Assessment, Jobs & Internships (Placement Portal for admins), Learning Roadmap, Analytics.
- `src/api.js` is a small fetch wrapper that attaches the JWT token to every request.
- In development, Vite proxies `/api` to the Express server (see `vite.config.js`), so there are no CORS problems.

## 3. Node.js + Express.js backend (`server/`)
- REST APIs, validation, JWT authentication, bcrypt password hashing and role-based access (student / admin).
- `models.js` holds the Mongoose schemas, `questions.js` the assessment question bank (correct answers never sent to the browser), `seed.js` demo data.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Profile | `GET/PUT /api/me`, `POST/DELETE /api/me/skills`, `PUT /api/me/progress` |
| Assessment | `GET /api/assessments/skills`, `GET /api/assessments/questions/:skill`, `POST /api/assessments/:skill`, `GET /api/assessments` |
| Jobs | `GET/POST /api/jobs`, `DELETE /api/jobs/:id` (admin), `POST /api/jobs/:id/apply` (student) |
| Applications | `GET /api/applications/mine`, `GET /api/applications` (admin), `PUT /api/applications/:id` (admin) |
| Analytics | `GET /api/analytics` |

## 4. Local MongoDB Database & MongoDB Compass
Collections: **users** (profile, skills, roadmap progress), **assessments**, **jobs**, **applications** (unique per student + job).

### Local Setup (Default):
1. **MongoDB Server**: Ensure your local MongoDB server is running (defaults to port `27017`).
2. **MongoDB Compass**: Open MongoDB Compass on your machine and connect using:
   ```
   mongodb://127.0.0.1:27017
   ```
   or
   ```
   mongodb://localhost:27017
   ```
3. The database will automatically be named **`skillbridge`**.
4. In `server/.env`, the connection URI is:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/skillbridge
   ```
5. Once you run `npm run seed`, you can refresh MongoDB Compass to inspect your seeded `users` and `jobs` collections.

*(Optional Cloud Alternative: You can still use MongoDB Atlas by updating `MONGODB_URI` in `server/.env` to your Atlas connection string).*

## 5. System architecture
```
 Users (Students · Placement Officer · Admin)
                 │
                 ▼
 React + Vite Frontend  (Login · Dashboard · Skills · Jobs · Analytics)
                 ⇅  HTTPS / JSON (REST)
 Node.js + Express.js Backend  (REST APIs · Validation · Authentication · Business logic)
                 ⇅  Mongoose
 Local MongoDB / Compass  (Users · Skills · Assessments · Jobs · Applications)
```

## 6. How to run
Requires Node.js 18+.
```
npm run setup            # installs root, server and client dependencies
npm run seed             # seeds demo admin, student, and jobs into local MongoDB
npm run dev              # API on :5000, web app on http://localhost:5173
```
Demo logins after seeding: `admin@skillbridge.com / admin123` · `student@skillbridge.com / student123`

Production: `npm run build --prefix client` (output in `client/dist`), `npm start --prefix server`.
