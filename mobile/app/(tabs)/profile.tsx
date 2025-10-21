import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [user, setUser] = useState({
    displayName: 'John Doe',
    email: 'john.doe@example.com',
    isOnline: true,
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement actual logout logic
            console.log('Logout pressed');
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // TODO: Navigate to edit profile screen
    console.log('Edit profile pressed');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings screen
    console.log('Settings pressed');
  };

  const handleNotifications = () => {
    // TODO: Navigate to notifications settings
    console.log('Notifications pressed');
  };

  const handlePrivacy = () => {
    // TODO: Navigate to privacy settings
    console.log('Privacy pressed');
  };

  const menuItems = [
    {
      icon: 'person-outline' as const,
      title: 'Edit Profile',
      onPress: handleEditProfile,
    },
    {
      icon: 'settings-outline' as const,
      title: 'Settings',
      onPress: handleSettings,
    },
    {
      icon: 'notifications-outline' as const,
      title: 'Notifications',
      onPress: handleNotifications,
    },
    {
      icon: 'shield-outline' as const,
      title: 'Privacy',
      onPress: handlePrivacy,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusIndicator, user.isOnline && styles.online]} />
        </View>
        
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.status}>
          {user.isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={24} color="#007AFF" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8E8E93',
    borderWidth: 3,
    borderColor: '#fff',
  },
  online: {
    backgroundColor: '#34C759',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  menu: {
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
  footer: {
    padding: 20,
    marginTop: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 8,
  },
});
