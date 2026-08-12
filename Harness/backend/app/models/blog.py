from sqlalchemy import Column, Integer, String, Text, Enum, TIMESTAMP, Date, ForeignKey, JSON, text
from sqlalchemy.orm import relationship
from app.models.user import Base

class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    post_date = Column(Date, nullable=False)
    post_type = Column(Enum('DAILY_MARKET', 'THEME_ANALYSIS', 'SECTOR_LEADER', 'SUPPLY_DEMAND'), nullable=False, server_default='DAILY_MARKET')
    title = Column(String(500), nullable=False)
    html_content = Column(Text, nullable=True)
    markdown_content = Column(Text, nullable=True)
    status = Column(Enum('DRAFT', 'READY', 'PUBLISHED'), server_default='DRAFT')
    seo_keywords = Column(String(500), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    published_at = Column(TIMESTAMP, nullable=True)

    snapshots = relationship("BlogDataSnapshot", back_populates="post", cascade="all, delete-orphan")


class BlogDataSnapshot(Base):
    __tablename__ = "blog_data_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("blog_posts.id", ondelete="CASCADE"))
    data_type = Column(String(50), nullable=True)
    raw_json = Column(JSON, nullable=True)
    captured_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

    post = relationship("BlogPost", back_populates="snapshots")
