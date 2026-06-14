from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db
import json

router = APIRouter()

@router.get("/queue")
def get_task_queue(db: Session = Depends(get_db)):
    """
    현재 task_queue의 모든 작업을 가져옵니다.
    """
    try:
        query = text("""
            SELECT task_id, job_name, step_name, status, payload, result_path, error_log, created_at, updated_at 
            FROM task_queue 
            ORDER BY created_at DESC 
            LIMIT 50
        """)
        results = db.execute(query).fetchall()
        
        tasks = []
        for row in results:
            tasks.append({
                "task_id": row[0],
                "job_name": row[1],
                "step_name": row[2],
                "status": row[3],
                "payload": json.loads(row[4]) if row[4] else {},
                "result_path": row[5],
                "error_log": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "updated_at": row[8].isoformat() if row[8] else None
            })
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add")
def add_task(job_name: str, step_name: str, payload: dict, db: Session = Depends(get_db)):
    """
    새로운 작업을 큐에 추가합니다.
    """
    try:
        query = text("""
            INSERT INTO task_queue (job_name, step_name, payload, status) 
            VALUES (:job_name, :step_name, :payload, 'PENDING')
        """)
        db.execute(query, {
            "job_name": job_name,
            "step_name": step_name,
            "payload": json.dumps(payload),
        })
        db.commit()
        return {"message": "Task added successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
