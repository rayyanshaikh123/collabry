/**
 * Study Board Types
 * Aligned with backend Board model + Yjs-based sync
 */

/** Minimal tldraw-style element stored in legacy elements array */
export interface BoardElement {
  id: string;
  type: string;
  typeName?: string;
  x: number;
  y: number;
  rotation?: number;
  isLocked?: boolean;
  opacity?: number;
  props?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  parentId?: string;
  index?: string;
  createdBy?: string;
}

/** Matches the backend Board mongoose model */
export interface StudyBoard {
  /** Returned as `_id` from Mongo, aliased to `id` in some paths */
  id: string;
  _id?: string;
  title: string;
  description?: string;
  owner: { _id: string; name: string; email: string } | string;
  ownerId?: string;
  members?: BoardMember[];
  /** Legacy — tldraw shapes are now synced via Yjs (yjsState) */
  elements?: BoardElement[];
  isPublic: boolean;
  settings?: BoardSettings;
  thumbnail?: string;
  tags?: string[];
  lastActivity?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  elementCount?: number;
  memberCount?: number;
}

export interface BoardMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt?: string;
  email?: string;
  name?: string;
}

export interface BoardSettings {
  backgroundColor?: string;
  gridEnabled?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  allowComments?: boolean;
  allowExport?: boolean;
}

/** Used for live presence via Yjs awareness */
export interface BoardParticipant {
  userId: string;
  userName: string;
  name: string;
  email?: string;
  userAvatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  cursor?: CursorPosition;
  isActive: boolean;
  joinedAt: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  color?: string;
}
