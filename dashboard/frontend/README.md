# Task Dashboard Frontend

React + TypeScript + Vite frontend for the Task Dashboard application.

## Features

- **Task Display**: View tasks organized by area headers
- **Filtering**: Filter tasks by area, context, and project using labeled dropdown menus
- **Sorting**: Sort tasks by priority, due date, or no sorting using a dedicated sort dropdown  
- **Task Management**: Check off tasks and recurring tasks
- **Responsive UI**: Clean, minimal design that works on various screen sizes

## UI Components

- `App.tsx` - Main application component with filtering and sorting logic
- `components/TaskList.tsx` - Displays tasks with area headers and checkoff functionality
- `components/Filters.tsx` - Dropdown filters for area, context, project, and sorting
- `types/task.d.ts` - TypeScript interfaces for task data

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend communicates with the FastAPI backend at `http://localhost:8000`:

- `GET /tasks` - Fetch tasks (supports sort parameters)
- `GET /recurring` - Fetch recurring tasks
- `POST /tasks/check` - Mark task as complete
- `POST /recurring/check` - Mark recurring task as done

## Development

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Make sure the backend is running on port 8000

The app will be available at `http://localhost:5173`
