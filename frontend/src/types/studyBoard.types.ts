/**
 * Study Board Types
 */

export type BoardElementType = 
  | 'text'
  | 'image'
  | 'sticky-note'
  | 'shape'
  | 'connector'
  | 'drawing';

export interface BoardElement {
  id: string;
  type: BoardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color?: string;
  fontSize?: number;
  imageUrl?: string;
  rotation?: number;
  locked?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyBoard {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  elements: BoardElement[];
  participants: BoardParticipant[];
  isPublic: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
}

export interface BoardParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  cursor?: CursorPosition;
  isActive: boolean;
  joinedAt: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  color: string;
}

export interface BoardUpdate {
  boardId: string;
  action: 'add' | 'update' | 'delete';
  element?: BoardElement;
  elementId?: string;
  userId: string;
  timestamp: string;
}
