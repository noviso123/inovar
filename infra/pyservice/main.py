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
from routes import (
    users, clients, equipments, requests, audit, uploads, prestadores, checklists, attachments, budgets, fiscal, agenda, finance
)

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize session and seed
    from database import SessionLocal
    db = SessionLocal()
    try:
        from models import User
        import uuid
        from datetime import datetime
        # For simplicity, we just check if any user exists
        if db.query(User).count() == 0:
            from passlib.hash import bcrypt
            admin = User(
                id=str(uuid.uuid4()),
                name="Administrador",
                email="admin@inovar.com",
                password_hash=bcrypt.hash("123456"),
                role="ADMIN_SISTEMA",
                active=True,
                must_change_password=True,
                created_at=datetime.utcnow()
            )
            db.add(admin)
            db.commit()
            print("✅ Python Data Service: Admin user created")
        else:
            print("✅ Python Data Service: Admin user already exists")
    finally:
        db.close()
    print("✅ Python Data Service: Database tables created and seeded")
    yield
    # Shutdown: Clean up if needed
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
app.include_router(requests.router, prefix="/db/requests", tags=["Requests"])
app.include_router(uploads.router, prefix="/db/uploads", tags=["Uploads"])
app.include_router(audit.router, prefix="/db/audit", tags=["Audit"])
app.include_router(prestadores.router, prefix="/db/prestadores", tags=["Prestadores"])
app.include_router(checklists.router, prefix="/db/checklists", tags=["Checklists"])
app.include_router(attachments.router, prefix="/db/attachments", tags=["Attachments"])
app.include_router(budgets.router, prefix="/db/budgets", tags=["Budgets"])
app.include_router(fiscal.router, prefix="/db/fiscal", tags=["Fiscal"])
app.include_router(agenda.router, prefix="/db/agenda", tags=["Agenda"])
app.include_router(finance.router, prefix="/db/finance", tags=["Finance"])

@app.get("/db/health")
def health():
    return {"status": "ok", "service": "inovar-data-service"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYSERVICE_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
