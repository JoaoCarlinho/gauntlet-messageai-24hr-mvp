import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Keyboard,
  Platform,
} from 'react-native';
import { InputToolbarProps } from '../../types';

const InputToolbar: React.FC<InputToolbarProps> = ({
  onSendMessage,
  onSendImage,
  onTypingStart,
  onTypingStop,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);
  const textInputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const minInputHeight = 40;
  const maxInputHeight = 120;

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      // Clear typing timeout and emit typing_stop
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (onTypingStop) {
        onTypingStop();
      }
      
      onSendMessage(trimmedMessage);
      setMessage('');
      setInputHeight(minInputHeight);
      Keyboard.dismiss();
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Handle typing indicators
    if (text.trim()) {
      // Emit typing_start event
      if (onTypingStart) {
        onTypingStart();
      }
      
      // Set timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (onTypingStop) {
          onTypingStop();
        }
      }, 3000);
    } else {
      // Emit typing_stop event when text is empty
      if (onTypingStop) {
        onTypingStop();
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Clear typing timeout when input loses focus
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Emit typing_stop event when input loses focus
    if (onTypingStop) {
      onTypingStop();
    }
  };

  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(
      Math.max(event.nativeEvent.contentSize.height, minInputHeight),
      maxInputHeight
    );
    setInputHeight(newHeight);
  };

  const handleImagePress = () => {
    if (onSendImage && !disabled) {
      onSendImage();
    }
  };

  const isSendDisabled = !message.trim() || disabled;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, isFocused && styles.focusedContainer]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            { height: inputHeight },
            disabled && styles.disabledInput,
          ]}
          value={message}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onContentSizeChange={handleContentSizeChange}
          placeholder={placeholder}
          placeholderTextColor="#8E8E93"
          multiline
          maxLength={1000}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />
        
        <View style={styles.buttonContainer}>
          {onSendImage && (
            <TouchableOpacity
              style={[styles.actionButton, disabled && styles.disabledButton]}
              onPress={handleImagePress}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={styles.imageButton}>
                <Text style={[styles.imageButtonText, Boolean(disabled) && styles.disabledButtonText]}>
                  📷
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              isSendDisabled && styles.disabledSendButton,
            ]}
            onPress={handleSendMessage}
            disabled={isSendDisabled}
            activeOpacity={0.7}
          >
            <View style={[
              styles.sendButtonInner,
              isSendDisabled && styles.disabledSendButtonInner,
            ]}>
              <Text style={[
                styles.sendButtonText,
                isSendDisabled && styles.disabledSendButtonText,
              ]}>
                ➤
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8, // Account for home indicator on iOS
  },
  focusedContainer: {
    borderTopColor: '#007AFF',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlignVertical: 'center',
    maxHeight: 120,
  },
  disabledInput: {
    color: '#8E8E93',
  },
  
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  actionButton: {
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  imageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtonText: {
    fontSize: 16,
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  disabledSendButton: {
    opacity: 0.5,
  },
  
  sendButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButtonInner: {
    backgroundColor: '#C6C6C8',
  },
  
  sendButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 2, // Slight offset to center the arrow
  },
  disabledSendButtonText: {
    color: '#8E8E93',
  },
});

export default InputToolbar;
