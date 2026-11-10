from langchain_community.embeddings import HuggingFaceEmbeddings


def get_embedding_model(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> HuggingFaceEmbeddings:
    """
    Initializes and returns the HuggingFace embedding model.
    
    Args:
        model_name (str): HuggingFace model identifier. Defaults to 'all-MiniLM-L6-v2'.
        
    Returns:
        HuggingFaceEmbeddings: Configured embedding model instance.
    """
    model_kwargs = {"device": "cpu"}
    encode_kwargs = {"normalize_embeddings": True}

    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    return embeddings

