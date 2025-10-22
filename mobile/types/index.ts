// Core Entity Types
export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string; // for group chats
  createdAt: Date;
  updatedAt: Date;
  members: ConversationMember[];
  messages?: Message[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: Date;
  lastReadAt?: Date;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  mediaUrl?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  sender?: User;
  readReceipts?: ReadReceipt[];
}

export interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: Date;
  user?: User;
}

// Backend Service Types (matching backend interfaces)
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  lastSeen: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileData {
  displayName?: string;
  avatarUrl?: string;
}

export interface ConversationWithMembers extends Conversation {
  members: (ConversationMember & {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      isOnline: boolean;
    };
  })[];
}

export interface ConversationWithLastMessage extends Conversation {
  members: (ConversationMember & {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      isOnline: boolean;
    };
  })[];
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    createdAt: Date;
    sender: {
      id: string;
      displayName: string;
    };
  };
  unreadCount: number;
}

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface MessageWithReadReceipts extends Message {
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  readReceipts: ReadReceipt[];
}

export interface PresenceStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  displayName: string;
  avatarUrl?: string;
}

export interface UserPresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface ConversationPresence {
  conversationId: string;
  onlineUsers: PresenceStatus[];
  totalMembers: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
}

export interface CreateConversationRequest {
  type: 'direct' | 'group';
  name?: string;
  memberIds: string[];
}

export interface CreateDirectConversationData {
  participantId: string;
}

export interface CreateGroupConversationData {
  name: string;
  participantIds: string[];
}

export interface AddMemberData {
  userId: string;
}

export interface CreateMessageData {
  content: string;
  type?: string;
  mediaUrl?: string;
}

export interface MessagePaginationOptions {
  page?: number;
  limit?: number;
  before?: string; // Message ID to get messages before this one
  after?: string;  // Message ID to get messages after this one
}

export interface MessageStatusUpdate {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface ReadReceiptData {
  messageId: string;
  userId: string;
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image';
  mediaUrl?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  avatarUrl?: string;
}

// Socket Event Types (matching backend socket handlers)
export interface SendMessageData {
  conversationId: string;
  content: string;
  type?: string;
  mediaUrl?: string;
  tempId?: string; // For optimistic updates
}

export interface MarkReadData {
  messageId: string;
  conversationId: string;
}

export interface MarkMessagesReadData {
  conversationId: string;
  upToMessageId?: string;
}

export interface MessageStatusUpdateData {
  messageId: string;
  conversationId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface NewMessageData {
  conversationId: string;
  content: string;
  type?: string;
  mediaUrl?: string;
}

export interface MessageUpdateData {
  messageId: string;
  conversationId: string;
}

export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;
  connect_error: (error: Error) => void;

  // Authentication
  authenticate: (token: string) => void;
  authenticated: () => void;
  authentication_error: (error: string) => void;

  // Room management
  join_conversation: (conversationId: string) => void;
  leave_conversation: (conversationId: string) => void;
  conversation_joined: (conversationId: string) => void;
  conversation_left: (conversationId: string) => void;

  // Messaging
  send_message: (data: SendMessageData) => void;
  message_received: (message: Message) => void;
  message_sent: (message: Message) => void;
  message_delivered: (data: { messageId: string; userId: string }) => void;
  message_read: (data: { messageId: string; userId: string }) => void;
  message_status_update: (data: MessageStatusUpdateData) => void;

  // Typing indicators
  typing_start: (data: { conversationId: string }) => void;
  typing_stop: (data: { conversationId: string }) => void;
  user_typing: (data: { conversationId: string; userId: string; userName: string }) => void;
  user_stopped_typing: (data: { conversationId: string; userId: string }) => void;

  // Presence
  user_online: (data: { userId: string; lastSeen: Date }) => void;
  user_offline: (data: { userId: string; lastSeen: Date }) => void;
  heartbeat: () => void;

  // Read receipts
  mark_read: (data: MarkReadData) => void;
  mark_messages_read: (data: MarkMessagesReadData) => void;
  read_receipt: (data: { messageId: string; userId: string; readAt: Date }) => void;
}

// Navigation Types
export interface RootStackParamList {
  '(auth)': undefined;
  '(tabs)': undefined;
  chat: { id: string };
  'group/new': undefined;
}

export interface AuthStackParamList {
  login: undefined;
  register: undefined;
}

export interface TabsStackParamList {
  index: undefined;
  profile: undefined;
}

// State Management Types
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ConversationsState {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
}

export interface MessagesState {
  messages: { [conversationId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  typingUsers: { [conversationId: string]: string[] };
}

export interface PresenceState {
  onlineUsers: { [userId: string]: boolean };
  lastSeen: { [userId: string]: Date };
}

// UI Component Props Types
export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export interface ChatItemProps {
  conversation: ConversationWithLastMessage;
  onPress: () => void;
  onLongPress?: () => void;
}

export interface InputToolbarProps {
  onSendMessage: (content: string) => void;
  onSendImage?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface TypingIndicatorProps {
  typingUsers: string[];
  conversationId: string;
}

export interface AvatarProps {
  user?: User;
  size?: number;
  showStatus?: boolean;
  onPress?: () => void;
}

export interface StatusIndicatorProps {
  isOnline: boolean;
  lastSeen?: Date;
  size?: number;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  phoneNumber?: string;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Utility Types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'system';
export type ConversationType = 'direct' | 'group';
export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Storage Types
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// All types are exported individually above
