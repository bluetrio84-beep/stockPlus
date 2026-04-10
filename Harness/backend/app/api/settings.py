from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, Integer, TIMESTAMP, text
from sqlalchemy.ext.declarative import declarative_base
from app.api import deps
from pydantic import BaseModel
from typing import Dict

router = APIRouter()
Base = declarative_base()

# --- 모델 정의 ---
class Config(Base):
    __tablename__ = "h_configs"
    id = Column(Integer, primary_key=True, index=True)
    cfg_key = Column(String(100), unique=True, nullable=False)
    cfg_value = Column(Text)

# --- 스키마 정의 ---
class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

@router.get("/")
def get_settings(db: Session = Depends(deps.get_db)):
    configs = db.query(Config).all()
    return {c.cfg_key: c.cfg_value for c in configs}

@router.post("/")
def update_settings(payload: SettingsUpdate, db: Session = Depends(deps.get_db)):
    for key, value in payload.settings.items():
        config = db.query(Config).filter(Config.cfg_key == key).first()
        if config:
            config.cfg_value = value
        else:
            new_config = Config(cfg_key=key, cfg_value=value)
            db.add(new_config)
    db.commit()
    return {"message": "Settings updated successfully"}
