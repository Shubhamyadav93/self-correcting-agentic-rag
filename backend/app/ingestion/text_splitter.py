from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def split_documents(
    documents: List[Document],
    chunk_size: int = 500,
    chunk_overlap: int = 50
) -> List[Document]:
    """
    Splits Document objects into smaller chunks using recursive character chunking.
    
    Args:
        documents (List[Document]): List of extracted Document objects.
        chunk_size (int): Maximum character size for each chunk. Defaults to 500.
        chunk_overlap (int): Number of overlapping characters between chunks. Defaults to 50.
        
    Returns:
        List[Document]: List of chunked Document objects preserving original metadata.
    """
    if not documents:
        print("[WARN] No documents provided to split.")
        return []

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )

    chunks = text_splitter.split_documents(documents)
    print(f"[SUCCESS] Successfully split {len(documents)} page(s) into {len(chunks)} chunks.")
    return chunks
