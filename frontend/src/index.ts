/**
 * Centralized Exports
 * Import everything you need from this single file
 */

// Stores
export { useAuthStore } from './stores/auth.store';
export { useUIStore } from './stores/ui.store';
export { useStudyBoardStore } from './stores/studyBoard.store';
export { useFocusModeStore } from './stores/focusMode.store';
export { useCollaborationStore } from './stores/collaboration.store';

// Hooks
export * from './hooks/useAuth';
export * from './hooks/useStudyBoard';
export * from './hooks/useFocusMode';
export * from './hooks/useCollaboration';

// Services
export { authService } from './services/auth.service';
export { studyBoardService } from './services/studyBoard.service';
export { focusService } from './services/focus.service';

// Guards
export { AuthGuard } from './guards/AuthGuard';
export { RoleGuard } from './guards/RoleGuard';

// Components
export { Providers } from './components/Providers';

// Lib
export { apiClient } from './lib/api';
export { socketClient } from './lib/socket';
export { queryClient } from './lib/queryClient';
export * from './lib/routes';

// Types
export * from './types';
