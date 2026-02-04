"""AI provider factory for selecting and instantiating providers."""
from typing import Optional
from .provider import AIProvider
from .providers.huggingface import HuggingFaceProvider
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider
from .providers.local import LocalProvider
from ..config import settings
from ..utils.logging import get_logger

logger = get_logger(__name__)

_provider_instance: Optional[AIProvider] = None


def get_ai_provider() -> AIProvider:
    """
    Get AI provider instance based on configuration.
    Singleton pattern to reuse the same provider instance.
    """
    global _provider_instance
    
    if _provider_instance is not None:
        return _provider_instance
    
    provider_name = settings.AI_PROVIDER.lower()
    
    logger.info(f"Initializing AI provider: {provider_name}")
    
    try:
        if provider_name == "openai":
            if not settings.OPENAI_API_KEY:
                logger.warning("OpenAI API key not found, falling back to HuggingFace")
                _provider_instance = HuggingFaceProvider()
            else:
                _provider_instance = OpenAIProvider()
        
        elif provider_name == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                logger.warning("Anthropic API key not found, falling back to HuggingFace")
                _provider_instance = HuggingFaceProvider()
            else:
                _provider_instance = AnthropicProvider()
        
        elif provider_name == "local":
            _provider_instance = LocalProvider()
        
        else:  # Default to huggingface
            _provider_instance = HuggingFaceProvider()
        
        logger.info(f"AI provider initialized: {type(_provider_instance).__name__}")
        return _provider_instance
    
    except Exception as e:
        logger.error(f"Failed to initialize AI provider {provider_name}: {e}")
        logger.info("Falling back to HuggingFace provider")
        _provider_instance = HuggingFaceProvider()
        return _provider_instance


def reset_provider():
    """Reset provider instance (useful for testing)."""
    global _provider_instance
    _provider_instance = None

