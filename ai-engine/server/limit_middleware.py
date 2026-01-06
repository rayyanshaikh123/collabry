"""
Usage limit checking middleware.

Enforces subscription tier limits for AI operations.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from core.usage_tracker import usage_tracker
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class UsageLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to check usage limits before processing AI requests."""
    
    # Subscription tier limits (tokens per month)
    TIER_LIMITS = {
        "free": 10000,
        "basic": 50000,
        "pro": 200000,
        "enterprise": 1000000
    }
    
    # Endpoints that consume tokens
    TOKEN_CONSUMING_ENDPOINTS = [
        "/ai/chat",
        "/ai/summarize",
        "/ai/qa",
        "/ai/mindmap",
        "/ai/sessions"
    ]
    
    async def dispatch(self, request: Request, call_next):
        """Check usage limits before processing request."""
        
        # Only check for token-consuming endpoints
        if not any(request.url.path.startswith(endpoint) for endpoint in self.TOKEN_CONSUMING_ENDPOINTS):
            return await call_next(request)
        
        # Skip check for GET requests (they don't consume tokens)
        if request.method == "GET":
            return await call_next(request)
        
        # Extract user_id from token
        user_id = None
        subscription_tier = "free"  # Default
        
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                from jose import jwt
                from config import CONFIG
                
                token = auth_header.replace("Bearer ", "")
                payload = jwt.decode(
                    token,
                    CONFIG["jwt_secret_key"],
                    algorithms=[CONFIG["jwt_algorithm"]]
                )
                user_id = payload.get("sub") or payload.get("id")
                subscription_tier = payload.get("subscriptionTier", "free")
        except Exception as e:
            logger.debug(f"Could not extract user info for limit check: {e}")
        
        # If we have a user_id, check their usage
        if user_id:
            try:
                # Get user's usage for current month
                usage_data = usage_tracker.get_user_usage(user_id, days=30)
                current_tokens = usage_data.get("total_tokens", 0)
                
                # Get tier limit
                tier_limit = self.TIER_LIMITS.get(subscription_tier, self.TIER_LIMITS["free"])
                
                # Check if user has exceeded limit
                if current_tokens >= tier_limit:
                    logger.warning(f"User {user_id} exceeded usage limit: {current_tokens}/{tier_limit}")
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "message": f"Monthly token limit exceeded ({tier_limit:,} tokens)",
                            "current_usage": current_tokens,
                            "limit": tier_limit,
                            "tier": subscription_tier,
                            "suggestion": "Upgrade your plan to continue using AI features"
                        }
                    )
                
                # Warn if approaching limit (>90%)
                usage_percentage = (current_tokens / tier_limit) * 100
                if usage_percentage > 90:
                    logger.info(f"User {user_id} approaching limit: {usage_percentage:.1f}%")
                    # Could add warning header to response
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error checking usage limits: {e}")
                # Don't block request if limit check fails
        
        # Process request
        return await call_next(request)
