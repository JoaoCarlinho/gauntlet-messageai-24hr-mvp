import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ConversationWithLastMessage, ChatItemProps } from '../../types';
import Avatar from '../ui/Avatar';
import StatusIndicator from '../ui/StatusIndicator';
import { usePresence } from '../../hooks/usePresence';

const ChatItem: React.FC<ChatItemProps> = ({
  conversation,
  onPress,
  onLongPress,
}) => {
  const { type, name, members, lastMessage, unreadCount } = conversation;
  
  // Use presence hook for real-time status updates
  const { isUserOnline, getUserStatus, formatLastSeen } = usePresence();

  // Get the other user for direct conversations
  const getOtherUser = () => {
    if (type === 'direct' && members.length > 0) {
      return members[0].user;
    }
    return null;
  };

  // Get conversation display name
  const getDisplayName = (): string => {
    if (type === 'group') {
      return name || 'Group Chat';
    }
    
    const otherUser = getOtherUser();
    return otherUser?.displayName || 'Unknown User';
  };

  // Get conversation avatar
  const getAvatarUser = () => {
    if (type === 'group') {
      // For group chats, we could show a group avatar or the first member's avatar
      return members[0]?.user;
    }
    return getOtherUser();
  };

  // Get online status for direct conversations using real-time presence
  const getOnlineStatus = () => {
    if (type === 'direct') {
      const otherUser = getOtherUser();
      if (otherUser?.id) {
        // Use real-time presence data if available, fallback to static data
        return isUserOnline(otherUser.id) || otherUser.isOnline;
      }
      return false;
    }
    
    // For group chats, show if any member is online using real-time presence
    return members.some(member => {
      if (member.user?.id) {
        return isUserOnline(member.user.id) || member.user.isOnline;
      }
      return member.user?.isOnline || false;
    });
  };

  // Get last seen for direct conversations using real-time presence
  const getLastSeen = () => {
    if (type === 'direct') {
      const otherUser = getOtherUser();
      if (otherUser?.id) {
        // Get real-time presence data
        const presenceStatus = getUserStatus(otherUser.id);
        if (presenceStatus) {
          return presenceStatus.lastSeen;
        }
        // Fallback to static data
        return otherUser.lastSeen;
      }
    }
    return undefined;
  };

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d`;
    }
  };

  // Get last message preview
  const getLastMessagePreview = (): string => {
    if (!lastMessage) {
      return 'No messages yet';
    }

    const { content, type: messageType, sender } = lastMessage;
    
    if (messageType === 'image') {
      return '📷 Photo';
    } else if (messageType === 'system') {
      return content;
    } else {
      // For group chats, show sender name
      if (type === 'group' && sender) {
        return `${sender.displayName}: ${content}`;
      }
      return content;
    }
  };

  // Truncate message preview
  const truncateMessage = (message: string, maxLength: number = 50): string => {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength) + '...';
  };

  const displayName = getDisplayName();
  const avatarUser = getAvatarUser();
  const isOnline = getOnlineStatus();
  const lastSeen = getLastSeen();
  const lastMessagePreview = truncateMessage(getLastMessagePreview());
  const timestamp = lastMessage ? formatTimestamp(new Date(lastMessage.createdAt)) : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          user={avatarUser || undefined}
          size={50}
          showStatus={type === 'direct'}
        />
        {type === 'group' && (
          <View style={styles.groupIndicator}>
            <Text style={styles.groupIndicatorText}>
              {members.length}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.nameText} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>
              {timestamp}
            </Text>
          </View>
        </View>

        <View style={styles.messageRow}>
          <View style={styles.messageContainer}>
            <Text style={styles.messageText} numberOfLines={1}>
              {lastMessagePreview}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            {type === 'direct' && (
              <View style={styles.presenceContainer}>
                <StatusIndicator
                  isOnline={isOnline}
                  lastSeen={lastSeen}
                  size={8}
                />
                {!isOnline && lastSeen && (
                  <Text style={styles.lastSeenText}>
                    {formatLastSeen(lastSeen)}
                  </Text>
                )}
              </View>
            )}
            
            {unreadCount && unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  groupIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  timestampContainer: {
    alignItems: 'flex-end',
  },
  timestampText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    marginRight: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastSeenText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ChatItem;
