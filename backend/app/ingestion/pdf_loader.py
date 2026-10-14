import os
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader


def load_pdf_documents(directory_path: str = "./data/raw_documents") -> List[Document]:
    """
    Loads all PDF documents from the specified directory.
    
    Args:
        directory_path (str): Path to directory containing PDF files. Defaults to "./data/raw_documents".
        
    Returns:
        List[Document]: List of loaded LangChain Document objects with page content and metadata.
    """

    if not os.path.exists(directory_path):
        os.makedirs(directory_path, exist_ok=True)
        print(f"[INFO] Directory not found, created: {directory_path}")
        return []

    pdf_files = [f for f in os.listdir(directory_path) if f.endswith(".pdf")]
    if not pdf_files:
        print(f"[WARN] No PDF files found in directory: {directory_path}")
        return []

    print(f"[INFO] Found {len(pdf_files)} PDF file(s): {pdf_files}")

    loader = DirectoryLoader(
        directory_path,
        glob="**/*.pdf",
        loader_cls=PyPDFLoader,
        show_progress=True
    )

    documents = loader.load()
    print(f"[SUCCESS] Successfully extracted {len(documents)} page(s) from PDFs.")
    return documents