import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.ingestion.pdf_loader import load_any_document
from app.ingestion.text_splitter import split_documents
from app.ingestion.vector_store import create_vector_store

router = APIRouter(prefix="/api", tags=["Document Ingestion"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DOCS_DIR = os.path.join(BASE_DIR, "data", "raw_documents")
os.makedirs(RAW_DOCS_DIR, exist_ok=True)


@router.post("/ingest")
async def ingest_clinical_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_path = os.path.join(RAW_DOCS_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        raw_docs = load_any_document(file_path)
        chunks = split_documents(raw_docs)
        create_vector_store(chunks)

        return {
            "status": "success",
            "filename": file.filename,
            "pages_loaded": len(raw_docs),
            "chunks_indexed": len(chunks),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
