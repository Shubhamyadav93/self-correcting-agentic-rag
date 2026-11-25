import os
from functools import lru_cache

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from langchain_community.embeddings import HuggingFaceEmbeddings


@lru_cache(maxsize=1)
def get_embedding_model(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> HuggingFaceEmbeddings:
    """
    Initializes and returns the HuggingFace embedding model strictly from local cache.
    Cached as a singleton via @lru_cache(maxsize=1) so uploading a PDF does not
    reload PyTorch/MiniLM weights from disk on every upload.
    """
    model_kwargs = {
        "device": "cpu",
        "local_files_only": True
    }
    encode_kwargs = {
        "normalize_embeddings": True,
        "batch_size": 64
    }

    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    return embeddings

