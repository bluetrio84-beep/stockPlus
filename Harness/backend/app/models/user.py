from sqlalchemy import Column, Integer, String, Boolean, Enum, TIMESTAMP, text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "h_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(Enum('ADMIN', 'USER'), server_default='USER')
    is_active = Column(Boolean, server_default='1')
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
