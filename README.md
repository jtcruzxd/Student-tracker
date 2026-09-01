# Student Attendance & Academic Performance Tracker

A full-stack web application for teachers and school staff to manage student profiles, attendance, grades, and academic activities in one place.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Install all dependencies (root workspace)
npm install

# 2. Run database migrations
cd server
npx prisma migrate dev

# 3. Seed demo data
npm run db:seed

# 4. Start both servers (from project root)
cd ..
npm run dev
```

The app will be available at **http://localhost:5173**  
The API runs at **http://localhost:3001**

---

## Features

### 1. Student Management
- Add, edit, and delete students with ID, name, class, email, and guardian contact
- Search by name, ID, or email; filter by class
- Sort by name, student ID, or class
- Delete confirmation dialog prevents accidental deletion
- Student profile page with full attendance history, grades by category, and activity scores

### 2. Attendance Management
- Record attendance sessions by date and class
- Mark each student as Present, Absent, Late, or Excused
- Bulk-set all students to the same status with one click
- Edit and delete existing sessions
- Filter sessions by class and date range
- Expandable session rows show individual student records
- Dashboard highlights students with < 75% attendance rate

### 3. Grades & Academic Performance
- Add, edit, and delete grade entries per student
- Categories: Quiz, Assignment, Recitation, Exam, Project, Custom
- Percentage is auto-calculated from score / max score
- Table view and card (visual) view
- Category summary cards show count and average per category
- Student profile shows a radar chart of performance across categories
- Performance status badges: Excellent / Good / Satisfactory / Passing / Failing

### 4. Activities (Quizzes, Assignments, Recitations)
- Create activities and auto-assign to all class students
- Record due date, activity date, max score, and description
- Enter scores per student with submission tracking and notes
- Scoring an activity auto-creates linked grade entries
- Filter by class and type

### 5. Dashboard
- Total students and classes
- Today's attendance summary with present/absent/late/excused counts
- Attendance bar chart
- Grade distribution pie chart
- Low-attendance student alert list (< 75%)
- Upcoming activities and recent grade entries

### 6. Import / Export
- **Import students** from CSV or Excel (upserts by Student ID)
- **Import grades** from CSV or Excel
- Row-level validation with clear error messages
- **Export students, attendance, and grades** as CSV or Excel
- Exports filterable by class, student, category, and date range

### 7. Classes Management
- Add, edit, and delete classes
- Shows student count per class
- Quick link to view class students

---

## Data Model

```
Class
  ├── id, name (unique), gradeLevel, section, schoolYear
  ├── → many Students
  ├── → many Activities
  └── → many AttendanceSessions

Student
  ├── id, studentId (unique), fullName, email, guardianContact
  ├── classId → Class
  ├── archived (soft-delete flag)
  ├── → many AttendanceRecords
  ├── → many GradeEntries
  └── → many ActivityScores

AttendanceSession
  ├── id, date, classId
  ├── unique: [date, classId] — one session per class per day
  └── → many AttendanceRecords

AttendanceRecord
  ├── id, status (PRESENT | ABSENT | LATE | EXCUSED), notes
  ├── sessionId → AttendanceSession
  ├── studentId → Student
  └── unique: [sessionId, studentId]

GradeEntry
  ├── id, title, category (QUIZ | ASSIGNMENT | RECITATION | EXAM | PROJECT | CUSTOM)
  ├── score, maxScore, percentage (auto-computed), remarks, date
  ├── studentId → Student
  └── activityId → Activity (optional, links to source activity)

Activity
  ├── id, title, type (QUIZ | ASSIGNMENT | RECITATION | EXAM | PROJECT)
  ├── description, dueDate, activityDate, maxScore
  ├── classId → Class
  └── → many ActivityScores

ActivityScore
  ├── id, score (nullable), submitted, notes
  ├── studentId → Student
  ├── activityId → Activity
  └── unique: [studentId, activityId]
```

**Key behavior:** When scores are saved via `PUT /api/activities/:id/scores`, the system automatically creates or updates linked `GradeEntry` records, keeping grades in sync with activity scores.

---

## Import / Export File Formats

### Student Import (CSV or XLSX)

| Column | Required | Notes |
|---|---|---|
| Student ID | Yes | Must be unique; used for upsert |
| Full Name | Yes | |
| Class | Yes | Must match existing class name exactly |
| Email | No | |
| Guardian Contact | No | |

**Example:**
```
Student ID,Full Name,Class,Email,Guardian Contact
2026-020,Juan Dela Cruz,Grade 10 - Rizal,juan@school.edu,09171234567
```

### Grade Import (CSV or XLSX)

| Column | Required | Notes |
|---|---|---|
| Student ID | Yes | Must match existing student's Student ID |
| Title | Yes | Activity/assessment name |
| Category | Yes | QUIZ, ASSIGNMENT, RECITATION, EXAM, PROJECT, or CUSTOM |
| Score | Yes | Numeric |
| Max Score | Yes | Numeric, must be > 0 |
| Date | Yes | YYYY-MM-DD format |
| Remarks | No | |

**Example:**
```
Student ID,Title,Category,Score,Max Score,Date,Remarks
2026-001,Quiz 3 - Polynomials,QUIZ,45,50,2026-09-10,Excellent
```

---

## Tech Stack

**Backend:**  
- Node.js + Express + TypeScript  
- Prisma ORM + SQLite  
- Zod (validation), Multer (file uploads), PapaParse (CSV), SheetJS (XLSX)

**Frontend:**  
- React 18 + TypeScript + Vite  
- Tailwind CSS (styling)  
- React Router v6 (routing)  
- Recharts (charts)  
- Axios (HTTP client)  
- react-hot-toast (notifications)  
- date-fns (date formatting)  
- Lucide React (icons)

---

## Scripts

```bash
# Root
npm run dev          # Start both server and client
npm run build        # Build the client

# Server (cd server)
npm run dev          # Start server in watch mode
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed demo data (19 students, 3 classes, 5 activities)
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## Demo Data

After running `npm run db:seed`, the database contains:

- **3 classes:** Grade 10 – Rizal, Grade 10 – Bonifacio, Grade 9 – Luna
- **19 students** across the three classes
- **Attendance sessions** for the last 5–10 school days
- **5 activities:** Quiz, Assignment, Recitation, Exam, and a Photosynthesis Quiz
- **Grade entries** for all Grade 10 students across multiple categories
