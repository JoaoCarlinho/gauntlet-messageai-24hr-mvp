import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { MessageBubbleProps, Message } from '../../types';
import Avatar from '../ui/Avatar';

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = false,
  showTimestamp = true,
  conversationType = 'direct',
  onPress,
  onLongPress,
}) => {
  const formatTime = (date: Date): string => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const getStatusIcon = (status: Message['status']): string => {
    switch (status) {
      case 'sending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '❌';
      default:
        return '';
    }
  };

  const getStatusColor = (status: Message['status']): string => {
    switch (status) {
      case 'sending':
        return '#8E8E93';
      case 'sent':
        return '#8E8E93';
      case 'delivered':
        return '#8E8E93';
      case 'read':
        return '#007AFF';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const renderMessageContent = () => {
    if (message.type === 'image' && message.mediaUrl) {
      return (
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          activeOpacity={0.8}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri: message.mediaUrl }}
            style={styles.messageImage}
            resizeMode="cover"
          />
          {message.status === 'sending' && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={styles.textContainer}
      >
        <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
          {message.content}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSenderInfo = () => {
    // Only show sender info for group conversations and received messages
    if (isOwn || conversationType !== 'group' || !message.sender) return null;

    return (
      <View style={styles.senderInfo}>
        <Avatar
          user={message.sender}
          size={24}
          showStatus={false}
        />
        <Text style={styles.senderName}>{message.sender.displayName}</Text>
      </View>
    );
  };

  const renderStatusIndicator = () => {
    if (!isOwn) return null;

    return (
      <View style={styles.statusContainer}>
        {message.status === 'sending' ? (
          <ActivityIndicator size="small" color={getStatusColor(message.status)} />
        ) : (
          <Text style={[styles.statusText, { color: getStatusColor(message.status) }]}>
            {getStatusIcon(message.status)}
          </Text>
        )}
      </View>
    );
  };

  const renderTimestamp = () => {
    if (!showTimestamp) return null;

    return (
      <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
        {formatTime(message.createdAt)}
      </Text>
    );
  };

  // Determine if we should show avatar for this message
  const shouldShowAvatar = !isOwn && conversationType === 'group' && message.sender;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {renderSenderInfo()}
      
      <View style={[styles.bubbleContainer, isOwn ? styles.ownBubbleContainer : styles.otherBubbleContainer]}>
        <View style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          message.status === 'failed' && styles.failedBubble
        ]}>
          {renderMessageContent()}
        </View>
        
        <View style={[styles.footer, isOwn ? styles.ownFooter : styles.otherFooter]}>
          {renderTimestamp()}
          {renderStatusIndicator()}
        </View>
      </View>
      
      {/* Avatar for group conversations */}
      {shouldShowAvatar && (
        <View style={styles.avatarContainer}>
          <Avatar
            user={message.sender}
            size={32}
            showStatus={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    marginHorizontal: 16,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  
  avatarContainer: {
    position: 'absolute',
    left: -40,
    top: 0,
    width: 32,
    height: 32,
  },
  
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8,
  },
  senderName: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 6,
    fontWeight: '500',
  },
  
  bubbleContainer: {
    maxWidth: '80%',
  },
  ownBubbleContainer: {
    alignItems: 'flex-end',
  },
  otherBubbleContainer: {
    alignItems: 'flex-start',
  },
  
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  failedBubble: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  
  textContainer: {
    minWidth: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  otherFooter: {
    justifyContent: 'flex-start',
  },
  
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    marginHorizontal: 4,
  },
  ownTimestamp: {
    color: '#8E8E93',
  },
  otherTimestamp: {
    color: '#8E8E93',
  },
  
  statusContainer: {
    marginLeft: 4,
    minWidth: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MessageBubble;
