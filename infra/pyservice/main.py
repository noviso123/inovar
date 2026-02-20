"""
INOVAR Python Data Service
===========================
FastAPI microservice handling all database and upload operations.
Go calls this service via HTTP for all data persistence.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routes import users, clients, equipments, requests as req_routes, uploads

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup"""
    Base.metadata.create_all(bind=engine)
    print("✅ Python Data Service: Database tables created")
    yield
    print("🛑 Python Data Service shutting down")

app = FastAPI(
    title="INOVAR Data Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(users.router, prefix="/db/users", tags=["Users"])
app.include_router(clients.router, prefix="/db/clients", tags=["Clients"])
app.include_router(equipments.router, prefix="/db/equipments", tags=["Equipments"])
app.include_router(req_routes.router, prefix="/db/requests", tags=["Requests"])
app.include_router(uploads.router, prefix="/db/uploads", tags=["Uploads"])

@app.get("/db/health")
def health():
    return {"status": "ok", "service": "inovar-data-service"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYSERVICE_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
