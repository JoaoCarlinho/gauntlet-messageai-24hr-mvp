import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { User } from '../../types';

export interface AvatarProps extends TouchableOpacityProps {
  user?: User;
  size?: number;
  showStatus?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  fallbackText?: string;
  imageUrl?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 40,
  showStatus = false,
  onPress,
  style,
  fallbackText,
  imageUrl,
  ...props
}) => {
  const avatarUrl = imageUrl || user?.avatarUrl;
  const displayName = user?.displayName || fallbackText || '?';
  const initials = getInitials(displayName);
  const isOnline = user?.isOnline || false;

  const avatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textStyle = {
    fontSize: size * 0.4,
    fontWeight: '600' as const,
  };

  const statusIndicatorSize = size * 0.25;
  const statusIndicatorStyle: ViewStyle = {
    width: statusIndicatorSize,
    height: statusIndicatorSize,
    borderRadius: statusIndicatorSize / 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    right: 0,
  };

  const renderAvatar = () => (
    <View style={[styles.container, avatarStyle, style]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, avatarStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallback, avatarStyle, { backgroundColor: getBackgroundColor(displayName) }]}>
          <Text style={[styles.initials, textStyle]}>{initials}</Text>
        </View>
      )}
      
      {showStatus && (
        <View
          style={[
            statusIndicatorStyle,
            { backgroundColor: isOnline ? '#34C759' : '#8E8E93' }
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} {...props}>
        {renderAvatar()}
      </TouchableOpacity>
    );
  }

  return renderAvatar();
};

// Helper function to get initials from display name
const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) {
    return '?';
  }

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

// Helper function to generate consistent background color based on name
const getBackgroundColor = (name: string): string => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Light Orange
    '#82E0AA', // Light Green
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default Avatar;
