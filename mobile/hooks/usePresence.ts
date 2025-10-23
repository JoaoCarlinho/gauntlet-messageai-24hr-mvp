import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';
import { socketManager } from '../lib/socket';
import { PresenceStatus, UserPresenceUpdate } from '../types';

export interface UsePresenceReturn {
  // State
  onlineUsers: { [userId: string]: boolean };
  lastSeen: { [userId: string]: Date };
  isOnline: boolean;
  
  // Actions
  getUserStatus: (userId: string) => PresenceStatus | null;
  getConversationPresence: (conversationId: string, memberIds: string[]) => PresenceStatus[];
  updatePresence: (isOnline: boolean) => void;
  
  // Utilities
  formatLastSeen: (lastSeen: Date) => string;
  isUserOnline: (userId: string) => boolean;
}

/**
 * Custom hook for managing user presence (online/offline status)
 * Tracks user online status and last seen timestamps
 */
export const usePresence = (): UsePresenceReturn => {
  const { currentUser } = useAuth();
  const { updatePresence: socketUpdatePresence } = useSocket();
  
  // Local state for presence tracking
  const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: boolean }>({});
  const [lastSeen, setLastSeen] = useState<{ [userId: string]: Date }>({});
  const [isOnline, setIsOnline] = useState<boolean>(false);
  
  // Refs to avoid stale closures
  const onlineUsersRef = useRef<{ [userId: string]: boolean }>({});
  const lastSeenRef = useRef<{ [userId: string]: Date }>({});
  
  // Update refs when state changes
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
    lastSeenRef.current = lastSeen;
  }, [onlineUsers, lastSeen]);

  // Socket event handlers for presence updates
  const handleUserOnline = useCallback((data: { userId: string; lastSeen: Date }) => {
    console.log('User came online:', data);
    setOnlineUsers(prev => ({
      ...prev,
      [data.userId]: true,
    }));
    setLastSeen(prev => ({
      ...prev,
      [data.userId]: new Date(data.lastSeen),
    }));
  }, []);

  const handleUserOffline = useCallback((data: { userId: string; lastSeen: Date }) => {
    console.log('User went offline:', data);
    setOnlineUsers(prev => ({
      ...prev,
      [data.userId]: false,
    }));
    setLastSeen(prev => ({
      ...prev,
      [data.userId]: new Date(data.lastSeen),
    }));
  }, []);

  // Set up socket listeners
  const { emit } = useSocket({
    onPresence: (event) => {
      // Handle presence updates from the socket
      if (event.isOnline) {
        handleUserOnline({ userId: event.userId, lastSeen: new Date(event.lastSeen) });
      } else {
        handleUserOffline({ userId: event.userId, lastSeen: new Date(event.lastSeen) });
      }
    },
  });

  // Listen for user_online and user_offline events
  useEffect(() => {
    // Set up direct event listeners for presence events
    const handleOnlineEvent = (data: { userId: string; lastSeen: Date }) => {
      handleUserOnline(data);
    };

    const handleOfflineEvent = (data: { userId: string; lastSeen: Date }) => {
      handleUserOffline(data);
    };

    // Add event listeners using socket manager only if socket is initialized
    if (socketManager && socketManager.connected) {
      socketManager.on('user_online', handleOnlineEvent);
      socketManager.on('user_offline', handleOfflineEvent);
    } else {
      console.warn('Cannot add listener - socket not initialized: user_online');
      console.warn('Cannot add listener - socket not initialized: user_offline');
    }

    // Cleanup function
    return () => {
      if (socketManager && socketManager.connected) {
        socketManager.off('user_online', handleOnlineEvent);
        socketManager.off('user_offline', handleOfflineEvent);
      }
    };
  }, [handleUserOnline, handleUserOffline]);

  // Update current user's online status when it changes
  useEffect(() => {
    if (currentUser) {
      setIsOnline(currentUser.isOnline);
      setOnlineUsers(prev => ({
        ...prev,
        [currentUser.id]: currentUser.isOnline,
      }));
      setLastSeen(prev => ({
        ...prev,
        [currentUser.id]: currentUser.lastSeen,
      }));
    }
  }, [currentUser]);

  // Function to get user status
  const getUserStatus = useCallback((userId: string): PresenceStatus | null => {
    const isUserOnline = onlineUsersRef.current[userId] ?? false;
    const userLastSeen = lastSeenRef.current[userId];
    
    if (!userLastSeen) {
      return null;
    }

    return {
      userId,
      isOnline: isUserOnline,
      lastSeen: userLastSeen,
      displayName: '', // This would need to be populated from user data
      avatarUrl: undefined, // This would need to be populated from user data
    };
  }, []);

  // Function to get presence for all members in a conversation
  const getConversationPresence = useCallback((conversationId: string, memberIds: string[]): PresenceStatus[] => {
    return memberIds
      .map(userId => getUserStatus(userId))
      .filter((status): status is PresenceStatus => status !== null);
  }, [getUserStatus]);

  // Function to update current user's presence
  const updatePresence = useCallback((isOnline: boolean) => {
    if (currentUser) {
      setIsOnline(isOnline);
      setOnlineUsers(prev => ({
        ...prev,
        [currentUser.id]: isOnline,
      }));
      setLastSeen(prev => ({
        ...prev,
        [currentUser.id]: new Date(),
      }));
      
      // Emit presence update to server
      socketUpdatePresence(isOnline);
    }
  }, [currentUser, socketUpdatePresence]);

  // Utility function to check if a user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsersRef.current[userId] ?? false;
  }, []);

  // Utility function to format last seen timestamp
  const formatLastSeen = useCallback((lastSeen: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return lastSeen.toLocaleDateString();
    }
  }, []);

  // Set up heartbeat to maintain online status
  useEffect(() => {
    if (!currentUser || !isOnline) return;

    const heartbeatInterval = setInterval(() => {
      // Send heartbeat to maintain online status
      socketManager.emit('heartbeat');
    }, 30000); // Send heartbeat every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [currentUser, isOnline]);

  // Handle app state changes to update presence
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (currentUser) {
        if (nextAppState === 'active') {
          updatePresence(true);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          updatePresence(false);
        }
      }
    };

    // Note: In a real implementation, you would use AppState from react-native
    // For now, we'll just set up the structure
    // AppState.addEventListener('change', handleAppStateChange);
    
    // return () => {
    //   AppState.removeEventListener('change', handleAppStateChange);
    // };
  }, [currentUser, updatePresence]);

  return {
    // State
    onlineUsers,
    lastSeen,
    isOnline,
    
    // Actions
    getUserStatus,
    getConversationPresence,
    updatePresence,
    
    // Utilities
    formatLastSeen,
    isUserOnline,
  };
};

export default usePresence;
