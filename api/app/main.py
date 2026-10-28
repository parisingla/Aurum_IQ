"""AURUM IQ engine — FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import SETTINGS
from app.routes import router


def create_app() -> FastAPI:
    app = FastAPI(title="AURUM IQ engine", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=SETTINGS.cors_origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
