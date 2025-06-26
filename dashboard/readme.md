# Task Dashboard App

A simple dashboard for viewing, filtering, and checking off tasks from your `tasks.txt` and `recurring_tasks.txt` files.

---

## Features
- View today's recurring tasks and upcoming tasks
- Filter tasks by area, context, and project with labeled dropdown menus
- Sort tasks by priority, due date, or no sorting with a dedicated sort dropdown
- Check off tasks and recurring tasks (updates your text files)
- Area headers properly group both regular tasks and recurring tasks
- Minimal, clean, and responsive UI

---

## Project Structure
```
dashboard/
├── backend/
│   ├── app.py
│   ├── parser.py
│   └── requirements.txt
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        ├── App.tsx
        ├── index.tsx
        └── types/
```

---

## Getting Started

### 1. Backend Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd dashboard/backend
   ```
2. (Optional) Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn app:app --reload
   ```
   - The API will be available at http://127.0.0.1:8000
   - Interactive docs: http://127.0.0.1:8000/docs

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd dashboard/frontend
   ```
2. If not already initialized, create a React app (TypeScript):
   ```bash
   npm create vite@latest . -- --template react-ts
   npm install
   ```
3. Start the frontend dev server:
   ```bash
   npm run dev
   ```
   - The app will be available at http://localhost:5173 (or similar)

---

## Usage
- The dashboard will display your tasks with proper area headers and allow you to filter and sort them
- Use the labeled dropdown menus to filter by area, context, or project  
- Use the sort dropdown to sort by priority, due date, or no sorting
- All changes are saved directly to `tasks.txt` and `recurring_tasks.txt`

---

## Notes
- Make sure your `tasks.txt` and `recurring_tasks.txt` files are in the correct location (project root or as configured in backend).
- The backend must be running for the frontend to fetch and update tasks.
- For production, further configuration and security may be needed.

---

## API Endpoints
- `GET /tasks` — List all tasks (supports ?sort=priority, ?sort=due, ?sort=none parameters)
- `GET /recurring` — List recurring tasks grouped by area headers
- `POST /tasks/check` — Mark a task as complete
- `POST /recurring/check` — Mark a recurring task as done for today

---

## First-Time Setup: Required Files

Make sure these files exist in your project root before running the dashboard:

- `tasks.txt` — Your main task list (see format in requirements)
- `recurring_tasks.txt` — Your recurring tasks (see format in requirements)
- `archive.txt` — (Optional) Archive for completed tasks
- `archive_completed_items.py` — (Optional) Script for archiving completed tasks

If these files do not exist, create empty files with these names in the project root:

```bash
touch tasks.txt recurring_tasks.txt archive.txt archive_completed_items.py
```

Refer to the requirements section above for the expected file formats.

---

## License
MIT
