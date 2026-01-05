
import { 
  LayoutDashboard, 
  PenTool, 
  Calendar, 
  Clock, 
  CreditCard, 
  User, 
  ShieldCheck, 
  LogOut, 
  Settings, 
  Bell, 
  Search,
  BookOpen,
  Trophy,
  Flame,
  Plus,
  StickyNote,
  Type,
  Image as ImageIcon,
  MousePointer2,
  Download,
  Share2,
  MoreVertical,
  CheckCircle2,
  Circle,
  MessageCircle,
  Sparkles,
  Trash2
} from 'lucide-react';
import { StudyBoard, Activity, Task } from './types';

// Store the component definitions, not the rendered elements.
export const ICONS = {
  Dashboard: LayoutDashboard,
  StudyBoard: PenTool,
  Planner: Calendar,
  Focus: Clock,
  Flashcards: CreditCard,
  Profile: User,
  Admin: ShieldCheck,
  Logout: LogOut,
  Settings: Settings,
  Notification: Bell,
  Search: Search,
  Book: BookOpen,
  Trophy: Trophy,
  Flame: Flame,
  Plus: Plus,
  StickyNote: StickyNote,
  Type: Type,
  Image: ImageIcon,
  Pointer: MousePointer2,
  Download: Download,
  Share: Share2,
  Menu: MoreVertical,
  Check: CheckCircle2,
  Uncheck: Circle,
  Chat: MessageCircle,
  Sparkles: Sparkles,
  Trash: Trash2,
};

export const MOCK_BOARDS: StudyBoard[] = [
  { id: '1', title: 'Advanced Calculus', lastActive: '2m ago', participants: 4, color: 'bg-indigo-500' },
  { id: '2', title: 'Neuroscience 101', lastActive: '1h ago', participants: 12, color: 'bg-rose-500' },
  { id: '3', title: 'World History Group', lastActive: '5h ago', participants: 8, color: 'bg-emerald-500' },
  { id: '4', title: 'Python Algorithms', lastActive: '1d ago', participants: 3, color: 'bg-amber-500' },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', user: 'Alex Kim', action: 'uploaded "Linear Algebra.pdf"', timestamp: '10m ago', type: 'upload' },
  { id: '2', user: 'Sarah Chen', action: 'commented on "Cell Structure"', timestamp: '45m ago', type: 'comment' },
  { id: '3', user: 'Jason Lee', action: 'edited the "Physics Notes" board', timestamp: '2h ago', type: 'edit' },
  { id: '4', user: 'Emma Watson', action: 'invited you to "Quantum Theory"', timestamp: '4h ago', type: 'invite' },
];

export const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Read Chapter 4: Genetics', completed: false, dueDate: 'Today, 5 PM', category: 'Reading' },
  { id: '2', title: 'Calculus Assignment 3', completed: true, dueDate: 'Yesterday', category: 'Assignment' },
  { id: '3', title: 'History Quiz Prep', completed: false, dueDate: 'Tomorrow', category: 'Exam' },
  { id: '4', title: 'Team Meeting: Project X', completed: false, dueDate: 'Wed, 2 PM', category: 'Other' },
];
