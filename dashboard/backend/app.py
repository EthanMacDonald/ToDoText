from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from parser import parse_tasks, parse_recurring_tasks, check_off_task, check_off_recurring_task, parse_tasks_by_priority, parse_tasks_no_sort

class CheckTaskRequest(BaseModel):
    task_id: str

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
