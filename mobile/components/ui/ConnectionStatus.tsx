import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useValues } from 'kea';
import messagesLogic from '../../store/messages';

interface ConnectionStatusProps {
  style?: any;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ style }) => {
  const { connectionStatus, isOffline, queuedMessages } = useValues(messagesLogic);
  const [slideAnim] = React.useState(new Animated.Value(-100));
  const [pulseAnim] = React.useState(new Animated.Value(1));

  // Animate banner slide in/out
  React.useEffect(() => {
    const shouldShow = isOffline || connectionStatus === 'connecting' || connectionStatus === 'reconnecting';
    
    if (shouldShow) {
      // Slide in
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, connectionStatus, slideAnim]);

  // Animate pulse for connecting states
  React.useEffect(() => {
    if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
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

  // Don't show banner when connected and no queued messages
  if (connectionStatus === 'connected' && Object.keys(queuedMessages).length === 0) {
    return null;
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        const queuedCount = Object.keys(queuedMessages).length;
        return queuedCount > 0 
          ? `No connection (${queuedCount} message${queuedCount === 1 ? '' : 's'} queued)`
          : 'No connection';
      case 'connected':
        const connectedQueuedCount = Object.keys(queuedMessages).length;
        return connectedQueuedCount > 0 
          ? `Connected (${connectedQueuedCount} message${connectedQueuedCount === 1 ? '' : 's'} syncing)`
          : 'Connected';
      default:
        return 'No connection';
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
        return '#FF4444'; // Red
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
        return '⚠';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor(),
          transform: [{ translateY: slideAnim }],
          opacity: pulseAnim,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={styles.text}>{getStatusText()}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 44, // Account for status bar
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ConnectionStatus;
