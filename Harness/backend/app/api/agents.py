from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Integer, Boolean, text
from sqlalchemy.ext.declarative import declarative_base
from app.api import deps
from typing import List
from pydantic import BaseModel
from app.core.broadcaster import log_broadcaster

router = APIRouter()
Base = declarative_base()

class Module(Base):
    __tablename__ = "h_modules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    instances = Column(Integer, default=1)

class AgentResponse(BaseModel):
    id: int
    name: str
    description: str
    is_active: bool
    instances: int
    load: int

@router.get("/", response_model=List[AgentResponse])
def list_agents(db: Session = Depends(deps.get_db)):
    modules = db.query(Module).all()
    return [
        AgentResponse(
            id=m.id,
            name=m.name,
            description=m.description,
            is_active=m.is_active,
            instances=m.instances,
            load=int(m.instances * 15.5)
        ) for m in modules
    ]

@router.post("/{agent_id}/scale")
async def scale_agent(agent_id: int, count: int, db: Session = Depends(deps.get_db)):
    agent = db.query(Module).filter(Module.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    old_count = agent.instances
    agent.instances = count
    db.commit()
    
    # 콘솔에 실시간 배치 로그 전송
    direction = "deployed" if count > old_count else "recalled"
    level = "PROCESS" if count > old_count else "WARNING"
    await log_broadcaster.broadcast(
        "SYSTEM", 
        f"Agent [{agent.name}] {direction}: {old_count} -> {count} units active.",
        level
    )
    
    return {"message": f"{agent.name} scaled to {count} instances"}

@router.get("/cost/today")
def get_daily_cost(db: Session = Depends(deps.get_db)):
    return {"total_cost": 0.0425}
