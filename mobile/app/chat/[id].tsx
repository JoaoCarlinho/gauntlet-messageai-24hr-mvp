import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Mock data for now - will be replaced with actual data
const mockMessages = [
  {
    id: '1',
    content: 'Hey, how are you doing?',
    senderId: 'other',
    senderName: 'John Doe',
    timestamp: '2:30 PM',
    status: 'read',
  },
  {
    id: '2',
    content: 'I\'m doing great! How about you?',
    senderId: 'me',
    senderName: 'Me',
    timestamp: '2:32 PM',
    status: 'read',
  },
  {
    id: '3',
    content: 'Pretty good, thanks for asking!',
    senderId: 'other',
    senderName: 'John Doe',
    timestamp: '2:33 PM',
    status: 'delivered',
  },
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Mock conversation data
  const conversation = {
    id: id,
    name: 'John Doe',
    isOnline: true,
  };

  useEffect(() => {
    // TODO: Load conversation and messages from API
    console.log('Loading conversation:', id);
  }, [id]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      senderId: 'me',
      senderName: 'Me',
      timestamp: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      status: 'sending',
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // TODO: Send message via socket/API
    console.log('Sending message:', message);

    // Simulate message being sent
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );
    }, 1000);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    // TODO: Emit typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      // Emit typing start
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      // Emit typing stop
    }
  };

  const renderMessage = ({ item }: { item: typeof mockMessages[0] }) => {
    const isMe = item.senderId === 'me';
    
    return (
      <View style={[styles.messageContainer, isMe && styles.myMessageContainer]}>
        <View style={[styles.messageBubble, isMe && styles.myMessageBubble]}>
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isMe && styles.myTimestamp]}>
              {item.timestamp}
            </Text>
            {isMe && (
              <Ionicons
                name={
                  item.status === 'read' ? 'checkmark-done' :
                  item.status === 'delivered' ? 'checkmark-done' :
                  item.status === 'sent' ? 'checkmark' : 'time'
                }
                size={16}
                color={
                  item.status === 'read' ? '#007AFF' :
                  item.status === 'delivered' ? '#007AFF' :
                  item.status === 'sent' ? '#8E8E93' : '#8E8E93'
                }
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>John is typing...</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{conversation.name}</Text>
          <Text style={styles.headerSubtitle}>
            {conversation.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="call-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        ListFooterComponent={isTyping ? renderTypingIndicator : null}
        inverted={false}
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? '#007AFF' : '#C7C7CC'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    backgroundColor: '#E5E5EA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myMessageBubble: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusIcon: {
    marginLeft: 4,
  },
  typingContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#E5E5EA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
});
