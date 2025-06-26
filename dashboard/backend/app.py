from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from parser import parse_tasks, parse_recurring_tasks, check_off_task, check_off_recurring_task, parse_tasks_by_priority, parse_tasks_no_sort, create_task

class CheckTaskRequest(BaseModel):
    task_id: str

class CreateTaskRequest(BaseModel):
    area: str
    description: str
    priority: Optional[str] = None
    due_date: Optional[str] = None  # Format: YYYY-MM-DD
    context: Optional[str] = None
    project: Optional[str] = None
    recurring: Optional[str] = None  # e.g., "daily", "weekly:Mon"

app = FastAPI()

# Allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/tasks")
def get_tasks(sort: str = "due"):
    """Get tasks with optional sorting
    
    Args:
        sort: Sorting method - 'due' (default), 'priority', or 'none'
    """
    if sort == "priority":
        return parse_tasks_by_priority()
    elif sort == "none":
        return parse_tasks_no_sort()
    else:
        return parse_tasks()  # Default due date sorting

@app.get("/recurring")
def get_recurring():
    return parse_recurring_tasks()

@app.post("/tasks/check")
def post_check_task(request: CheckTaskRequest):
    success = check_off_task(request.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@app.post("/recurring/check")
def post_check_recurring(request: CheckTaskRequest):
    success = check_off_recurring_task(request.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurring task not found")
    return {"success": True}

@app.post("/tasks/create")
def post_create_task(request: CreateTaskRequest):
    success = create_task(request)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create task")
    return {"success": True}

@app.post("/tasks")
def create_task(request: CreateTaskRequest):
    """Create a new task and add it to the tasks.txt file
    
    Args:
        request: Task details
    
    Returns:
        A success message
    """
    # Here you would add the logic to append the task to the tasks.txt file
    # For now, we'll just return the received data as a placeholder
    return {"success": True, "task": request}
