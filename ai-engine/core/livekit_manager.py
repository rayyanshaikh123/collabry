"""
LiveKit Room and Token Management for Voice Tutor Sessions
"""
import os
import time
from typing import Optional
from datetime import timedelta
from livekit import api
from livekit.api import room_service
import aiohttp
import logging

logger = logging.getLogger(__name__)


class LiveKitManager:
    """Manages LiveKit rooms and access tokens for voice tutor sessions"""
    
    def __init__(
        self, 
        api_key: Optional[str] = None, 
        api_secret: Optional[str] = None, 
        url: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("LIVEKIT_API_KEY")
        self.api_secret = api_secret or os.getenv("LIVEKIT_API_SECRET")
        self.url = url or os.getenv("LIVEKIT_WS_URL", "ws://localhost:7880")
        
        if not self.api_key or not self.api_secret:
            raise ValueError("LiveKit API credentials not configured")
        
        logger.info(f"LiveKitManager initialized with URL: {self.url}")
    
    async def create_classroom_room(
        self, 
        notebook_id: str, 
        user_id: str
    ) -> dict:
        """
        Creates a LiveKit room for a teaching session
        
        Args:
            notebook_id: The notebook being studied
            user_id: The student's user ID
            
        Returns:
            dict with room_name and metadata
        """
        timestamp = int(time.time())
        room_name = f"tutor_{notebook_id}_{user_id}_{timestamp}"
        
        # Create room with LiveKit API
        async with aiohttp.ClientSession() as session:
            svc = room_service.RoomService(
                session, self.url, self.api_key, self.api_secret
                )
        
            try:
                room = await svc.create_room(
                    room_service.CreateRoomRequest(
                        name=room_name,
                        empty_timeout=1800,  # 30 minutes empty room timeout
                        max_participants=10,  # 1 AI + up to 9 students (future multi-user)
                    )
                )
                
                logger.info(f"Created LiveKit room: {room_name}")
                
                return {
                    "room_name": room_name,
                    "room_sid": room.sid,
                    "notebook_id": notebook_id,
                    "user_id": user_id
                }
                
            except Exception as e:
                logger.error(f"Failed to create LiveKit room: {e}")
                raise
    
    def generate_student_token(
        self, 
        room_name: str, 
        user_id: str,
        username: str = "Student"
    ) -> str:
        """
        Generates access token for student participant
        
        Args:
            room_name: The room to join
            user_id: Unique user identifier
            username: Display name
            
        Returns:
            JWT access token
        """
        token = api.AccessToken(self.api_key, self.api_secret)
        token.with_identity(f"student_{user_id}")
        token.with_name(username)
        token.with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True
            )
        )
        token.with_ttl(timedelta(hours=2))  # 2 hours
        
        jwt_token = token.to_jwt()
        logger.info(f"Generated student token for {username} in room {room_name}")
        
        return jwt_token
    
    def generate_agent_token(
        self, 
        room_name: str,
        agent_name: str = "AI Tutor"
    ) -> str:
        """
        Generates access token for AI tutor participant
        
        Args:
            room_name: The room to join
            agent_name: Display name for the agent
            
        Returns:
            JWT access token
        """
        token = api.AccessToken(self.api_key, self.api_secret)
        token.with_identity(f"agent_{room_name}")
        token.with_name(agent_name)
        token.with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                hidden=False  # Set to True to hide agent from participant list
            )
        )
        token.with_ttl(timedelta(hours=2))  # 2 hours
        
        jwt_token = token.to_jwt()
        logger.info(f"Generated agent token for room {room_name}")
        
        return jwt_token
    
    async def end_room(self, room_name: str) -> None:
        """End a LiveKit room"""
        async with aiohttp.ClientSession() as session:
            svc = room_service.RoomService(
                session, self.url, self.api_key, self.api_secret
                )
        
            try:
                await svc.delete_room(room_service.DeleteRoomRequest(room=room_name))
                logger.info(f"Deleted LiveKit room: {room_name}")
            except Exception as e:
                logger.error(f"Failed to delete room {room_name}: {e}")
                raise
    
    async def list_participants(self, room_name: str) -> list:
        """List all participants in a room"""
        async with aiohttp.ClientSession() as session:
            svc = room_service.RoomService(
                session, self.url, self.api_key, self.api_secret
                )
        
            try:
                participants = await svc.list_participants(
                    room_service.ListParticipantsRequest(room=room_name)
                )
                return [
                    {
                        "identity": p.identity,
                        "name": p.name,
                        "joined_at": p.joined_at
                    }
                    for p in participants
                ]
            except Exception as e:
                logger.error(f"Failed to list participants in {room_name}: {e}")
                return []
