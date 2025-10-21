import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

export interface StatusIndicatorProps {
  isOnline: boolean;
  lastSeen?: Date;
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isOnline,
  lastSeen,
  size = 12,
  showText = false,
  style,
  textStyle,
}) => {
  const getStatusText = (): string => {
    if (isOnline) {
      return 'Online';
    }

    if (!lastSeen) {
      return 'Offline';
    }

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  const getStatusColor = (): string => {
    if (isOnline) {
      return '#34C759'; // Green
    }

    if (!lastSeen) {
      return '#8E8E93'; // Gray
    }

    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (diffInMinutes < 5) {
      return '#FF9500'; // Orange (recently active)
    } else if (diffInMinutes < 60) {
      return '#FFCC00'; // Yellow (active within hour)
    } else {
      return '#8E8E93'; // Gray (offline)
    }
  };

  const indicatorStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: getStatusColor(),
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.indicator, indicatorStyle]} />
      {showText && (
        <Text style={[styles.text, textStyle]}>
          {getStatusText()}
        </Text>
      )}
    </View>
  );
};

// Preset components for common use cases
export const OnlineIndicator: React.FC<Omit<StatusIndicatorProps, 'isOnline'>> = (props) => (
  <StatusIndicator {...props} isOnline={true} />
);

export const OfflineIndicator: React.FC<Omit<StatusIndicatorProps, 'isOnline'>> = (props) => (
  <StatusIndicator {...props} isOnline={false} />
);

export const LastSeenIndicator: React.FC<{
  lastSeen: Date;
  size?: number;
  showText?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}> = ({ lastSeen, ...props }) => (
  <StatusIndicator {...props} isOnline={false} lastSeen={lastSeen} />
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default StatusIndicator;
