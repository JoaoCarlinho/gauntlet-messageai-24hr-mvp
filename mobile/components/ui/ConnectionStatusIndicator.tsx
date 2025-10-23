import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useValues } from 'kea';
import messagesLogic from '../../store/messages';

interface ConnectionStatusIndicatorProps {
  style?: any;
  showWhenConnected?: boolean;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  style,
  showWhenConnected = false,
}) => {
  const { connectionStatus, isOffline, queuedMessages } = useValues(messagesLogic);
  const [pulseAnim] = React.useState(new Animated.Value(1));

  // Animate the indicator when connecting/reconnecting
  React.useEffect(() => {
    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [connectionStatus, pulseAnim]);

  // Don't show indicator if connected and showWhenConnected is false
  if (connectionStatus === 'connected' && !showWhenConnected) {
    return null;
  }

  // Don't show indicator if disconnected and no queued messages
  if (connectionStatus === 'disconnected' && Object.keys(queuedMessages).length === 0) {
    return null;
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return `Offline (${Object.keys(queuedMessages).length} queued)`;
      case 'connected':
        return 'Connected';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
      case 'reconnecting':
        return '#FFA500'; // Orange
      case 'disconnected':
        return '#FF4444'; // Red
      case 'connected':
        return '#44FF44'; // Green
      default:
        return '#888888'; // Gray
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
      case 'reconnecting':
        return '⟳';
      case 'disconnected':
        return '⚠';
      case 'connected':
        return '✓';
      default:
        return '';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor(),
          opacity: pulseAnim,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.icon}>{getStatusIcon()}</Text>
      <Text style={styles.text}>{getStatusText()}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ConnectionStatusIndicator;
