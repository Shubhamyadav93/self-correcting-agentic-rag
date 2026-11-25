import os
from typing import List, Optional
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma

from app.ingestion.pdf_loader import load_pdf_documents
from app.ingestion.text_splitter import split_documents
from app.ingestion.embeddings import get_embedding_model


def create_vector_store(
    chunks: List[Document],
    persist_directory: str = "./data/chroma_db",
    collection_name: str = "medical_guidelines",
    batch_size: int = 64
) -> Optional[Chroma]:
    """
    Indexes text chunks using the cached embedding model and persists them into ChromaDB in batches.

    Args:
        chunks (List[Document]): List of chunked Document objects.
        persist_directory (str): Local path where ChromaDB persists data.
        collection_name (str): Name of the collection in ChromaDB.
        batch_size (int): Batch size for indexing chunks into ChromaDB.

    Returns:
        Optional[Chroma]: Created or updated Chroma vector store instance, or None if chunks list is empty.
    """
    if not chunks:
        print("[WARN] No chunks provided to create vector store.")
        return None

    embeddings = get_embedding_model()

    print(f"[INFO] Indexing {len(chunks)} chunks into ChromaDB (batch_size={batch_size})...")
    vector_store = Chroma(
        persist_directory=persist_directory,
        embedding_function=embeddings,
        collection_name=collection_name
    )

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        vector_store.add_documents(documents=batch)

    print(f"[SUCCESS] Vector store successfully created/updated at: {persist_directory}")
    return vector_store


def load_vector_store(
    persist_directory: str = "./data/chroma_db",
    collection_name: str = "medical_guidelines"
) -> Optional[Chroma]:
    """
    Loads an existing persisted ChromaDB vector store from disk.

    Args:
        persist_directory (str): Local path where ChromaDB is saved.
        collection_name (str): Name of the ChromaDB collection.

    Returns:
        Optional[Chroma]: Loaded Chroma vector store instance, or None if path does not exist.
    """
    if not os.path.exists(persist_directory):
        print(f"[ERROR] Vector database path does not exist: {persist_directory}")
        return None

    embeddings = get_embedding_model()
    vector_store = Chroma(
        persist_directory=persist_directory,
        embedding_function=embeddings,
        collection_name=collection_name
    )
    return vector_store


def run_ingestion_pipeline(
    pdf_dir: str = "./data/raw_documents",
    db_dir: str = "./data/chroma_db",
    batch_size: int = 64
) -> Optional[Chroma]:
    """
    Orchestrates the entire ingestion pipeline:
    PDF Loader -> Text Splitter -> Embeddings -> ChromaDB Persistence.

    Args:
        pdf_dir (str): Directory containing source PDF documents.
        db_dir (str): Directory to persist the Chroma database.
        batch_size (int): Batch size for Chroma indexing.

    Returns:
        Optional[Chroma]: Populated Chroma vector store instance, or None if any step fails.
    """
    print("\n========== STARTING INGESTION PIPELINE ==========")

    # Step 1: Load raw documents
    raw_docs = load_pdf_documents(pdf_dir)
    if not raw_docs:
        print("[ERROR] PDF loading failed. Ingestion pipeline aborted.")
        return None

    # Step 2: Split documents into chunks
    chunks = split_documents(raw_docs)
    if not chunks:
        print("[ERROR] Text splitting failed. Ingestion pipeline aborted.")
        return None

    # Step 3: Embed and persist chunks into ChromaDB in batches
    vector_store = create_vector_store(chunks=chunks, persist_directory=db_dir, batch_size=batch_size)

    print("========== INGESTION PIPELINE COMPLETED ==========\n")
    return vector_store


if __name__ == "__main__":
    run_ingestion_pipeline()
