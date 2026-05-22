"""
EventFlow - API Face Registration Helper
File: register_from_api.py

This script is called from the Next.js API to extract face embeddings
from an image and save them to the Supabase database.

Usage (from Node.js):
    python register_from_api.py <image_path> <participant_id>

Returns JSON with status and embedding data.
"""

import sys
import json
import logging
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from face_recognition_module.face_engine import FaceEngine
import cv2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eventflow.register_api")


def extract_embedding(image_path: str) -> dict:
    """
    Extract face embedding from image.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Dict with status and embedding array, or error
    """
    try:
        # Verify image exists
        if not Path(image_path).exists():
            return {
                "success": False,
                "error": f"Image file not found: {image_path}"
            }
        
        # Read image
        frame = cv2.imread(image_path)
        if frame is None:
            return {
                "success": False,
                "error": "Failed to read image file"
            }
        
        # Initialize face engine
        logger.info("Initializing FaceEngine...")
        engine = FaceEngine(model_name="buffalo_l", use_gpu=False)
        
        # Extract embedding
        logger.info("Extracting embedding...")
        embedding = engine.detect_and_embed(frame)
        
        if embedding is None:
            return {
                "success": False,
                "error": "No face detected in image. Please ensure your face is clearly visible."
            }
        
        logger.info(f"Embedding extracted - shape: {embedding.shape}")
        
        # Convert to list for JSON serialization
        embedding_list = embedding.astype(np.float32).tolist()
        
        return {
            "success": True,
            "embedding": embedding_list,
            "embedding_shape": list(embedding.shape),
        }
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python register_from_api.py <image_path>"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = extract_embedding(image_path)
    print(json.dumps(result))
