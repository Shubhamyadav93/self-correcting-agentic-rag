import os
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    CSVLoader,
    UnstructuredFileLoader
)

# Supported file extensions
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv"}

def _extract_scanned_pdf_ocr(file_path: str) -> List[Document]:
    """
    Fallback OCR extractor for scanned image-only PDFs using pdf2image and pytesseract.
    Agar PDF me direct selectable text nahi hai toh ye page-by-page OCR chalata hai.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract

        print(f"[INFO] Running OCR fallback on scanned PDF: {file_path}")
        images = convert_from_path(file_path)
        ocr_documents = []

        for page_idx, img in enumerate(images):
            text = pytesseract.image_to_string(img)
            if text.strip():
                ocr_documents.append(
                    Document(
                        page_content=text,
                        metadata={
                            "source": file_path,
                            "page": page_idx + 1,
                            "extraction_method": "ocr"
                        }
                    )
                )

        print(f"[SUCCESS] OCR extracted {len(ocr_documents)} page(s) from {file_path}")
        return ocr_documents
    except ImportError:
        print("[WARN] 'pytesseract' ya 'pdf2image' installed nahi hai. Skipping OCR extraction.")
        return []
    except Exception as e:
        print(f"[ERROR] OCR extraction failed for {file_path}: {e}")
        return []


def load_any_document(file_path: str) -> List[Document]:
    """
    Loads a single document of any supported format (.pdf, .docx, .txt, .csv, etc.)
    with automatic OCR fallback for scanned PDFs.
    """
    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return []

    ext = os.path.splitext(file_path)[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        print(f"[WARN] Unsupported extension '{ext}' for file {file_path}. Trying generic fallback.")
        try:
            return UnstructuredFileLoader(file_path).load()
        except Exception:
            return []

    try:
        # 1. PDF Handling (Digital PDF + Scanned PDF OCR Fallback)
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
            docs = loader.load()

            # Check if PDF contains actual text or is a scanned image
            total_text_length = sum(len(doc.page_content.strip()) for doc in docs)
            if total_text_length == 0:
                print(f"[INFO] No digital text detected in {file_path}. Triggering OCR...")
                ocr_docs = _extract_scanned_pdf_ocr(file_path)
                return ocr_docs if ocr_docs else docs
            return docs

        # 2. Word Documents (.docx, .doc)
        elif ext in [".docx", ".doc"]:
            return Docx2txtLoader(file_path).load()

        # 3. Plain Text / Markdown
        elif ext in [".txt", ".md"]:
            return TextLoader(file_path, encoding="utf-8").load()

        # 4. CSV Spreadsheets
        elif ext == ".csv":
            return CSVLoader(file_path).load()

    except Exception as e:
        print(f"[ERROR] Failed to load file {file_path}: {e}")
        return []

    return []


def load_pdf_documents(directory_path: str = "./data/raw_documents") -> List[Document]:
    """
    Scans directory and loads all supported files (.pdf, .docx, .txt, .csv).
    Keeps original function name for backward compatibility.
    """

    if not os.path.exists(directory_path):
        os.makedirs(directory_path, exist_ok=True)
        print(f"[INFO] Directory not found, created: {directory_path}")
        return []

    all_files = [
        os.path.join(directory_path, f)
        for f in os.listdir(directory_path)
        if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS
    ]

    if not all_files:
        print(f"[WARN] No supported documents found in directory: {directory_path}")
        return []

    print(f"[INFO] Found {len(all_files)} supported file(s) in {directory_path}")

    all_documents: List[Document] = []
    for file_path in all_files:
        docs = load_any_document(file_path)
        all_documents.extend(docs)

    print(f"[SUCCESS] Successfully extracted {len(all_documents)} document unit(s) across all files.")
    return all_documents

