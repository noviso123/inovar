"""Upload routes — file storage handled by Python"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from datetime import datetime
import uuid
import os
import aiofiles

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "../../server/data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = os.path.splitext(file.filename)[1] or ".bin"
    new_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, new_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return {"data": {"url": f"/uploads/{new_name}", "filename": new_name, "size": len(content)}}

@router.delete("/{filename}")
def delete_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": "Deleted"}
    raise HTTPException(404, "File not found")
