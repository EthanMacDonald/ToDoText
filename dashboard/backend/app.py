from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from parser import parse_tasks, parse_recurring_tasks, check_off_task, check_off_recurring_task

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
def get_tasks():
    return parse_tasks()

@app.get("/recurring")
def get_recurring():
    return parse_recurring_tasks()

@app.post("/tasks/check")
def post_check_task(task_id: str):
    success = check_off_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@app.post("/recurring/check")
def post_check_recurring(task_id: str):
    success = check_off_recurring_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurring task not found")
    return {"success": True}
