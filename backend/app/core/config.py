from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Database
    # Database
    DATABASE_URL: str

    # Paths
    TILES_DIR: str = "/tiles"
    # Topluluk notu ekleri (PDF / görsel); mutlak yol veya proje köküne göreli
    COMMUNITY_UPLOADS_DIR: str = "data/community_uploads"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = "sk-placeholder"

    # Hugging Face (isteğe bağlı — kapalı veri kümeleri veya rate limit için)
    HF_TOKEN: str | None = None

    # JWT
    JWT_SECRET: str = "change_this_secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost", 
        "https://localhost",
        "capacitor://localhost", 
        "http://localhost:8000"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            if field_name == "BACKEND_CORS_ORIGINS":
                return json.loads(raw_val)
            return raw_val


settings = Settings()

# 🛡️ BULLETPROOF CORS: Sunucudaki .env dosyası listeyi ezse bile, 
# Android için gereken izinleri zorla ekleyelim.
required_origins = ["capacitor://localhost", "http://localhost", "https://localhost"]
for origin in required_origins:
    if origin not in settings.BACKEND_CORS_ORIGINS:
        settings.BACKEND_CORS_ORIGINS.append(origin)
