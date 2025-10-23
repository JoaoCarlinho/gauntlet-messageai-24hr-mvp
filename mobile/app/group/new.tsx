import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../hooks/useAuth';
import { usersAPI } from '../../lib/api';
import { User, CreateGroupConversationData } from '../../types';

export default function NewGroupScreen() {
  const { isAuthenticated } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Get conversations hook for creating groups
  const { createGroupConversation, isLoading: isCreatingGroup, error: createError } = useConversations();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  // Search users function
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      setSearchError(null);
      return;
    }

    // Check minimum query length
    if (query.trim().length < 3) {
      setUsers([]);
      setSearchError(null);
      return;
    }

    // Check authentication before making API calls
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping user search');
      setSearchError('Please log in to search for users');
      setUsers([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const searchResults = await usersAPI.searchUsers(query);
      setUsers(searchResults);
    } catch (error) {
      console.error('Search users error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Search query too short')) {
          setSearchError(null); // Don't show error for short queries
          setUsers([]);
        } else {
          setSearchError(error.message);
          setUsers([]);
        }
      } else {
        setSearchError('Failed to search users');
        setUsers([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [isAuthenticated]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  // Handle user selection
  const handleUserToggle = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(selectedUser => selectedUser.id === user.id);
      if (isSelected) {
        return prev.filter(selectedUser => selectedUser.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Check if user is selected
  const isUserSelected = (user: User) => {
    return selectedUsers.some(selectedUser => selectedUser.id === user.id);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedUsers.length < 1) {
      Alert.alert('Error', 'Please select at least 1 member');
      return;
    }

    setIsCreating(true);
    try {
      const groupData: CreateGroupConversationData = {
        name: groupName.trim(),
        participantIds: selectedUsers.map(user => user.id),
      };

      // Create group conversation
      createGroupConversation(groupData);

      // Show success message
      Alert.alert(
        'Success',
        'Group created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to conversations list
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Check if create button should be enabled
  const isCreateEnabled = groupName.trim().length > 0 && selectedUsers.length >= 1 && !isCreating && !isCreatingGroup;

  const renderUser = ({ item }: { item: User }) => {
    const selected = isUserSelected(item);
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleUserToggle(item)}
        accessibilityLabel={`${item.displayName}, ${item.email}`}
        accessibilityHint={selected ? "Remove from group" : "Add to group"}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <View style={styles.contactInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{item.displayName}</Text>
            <Text style={styles.contactEmail}>{item.email}</Text>
          </View>
        </View>
        <View style={[
          styles.checkbox,
          selected && styles.checkboxSelected
        ]}>
          {selected && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedUser = ({ item }: { item: User }) => (
    <View style={styles.selectedUserChip}>
      <Text style={styles.selectedUserText}>{item.displayName}</Text>
      <TouchableOpacity
        onPress={() => handleUserToggle(item)}
        style={styles.removeUserButton}
        accessibilityLabel={`Remove ${item.displayName} from group`}
        accessibilityRole="button"
        accessibilityHint="Tap to remove this user from the group"
      >
        <Ionicons name="close" size={16} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Group</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.groupNameSection}>
            <Text style={styles.sectionTitle}>Group Name</Text>
            <TextInput
              style={styles.groupNameInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name"
              placeholderTextColor="#8E8E93"
              maxLength={50}
              accessibilityLabel="Group name input"
              accessibilityHint="Enter a name for your group"
            />
          </View>

          <View style={styles.contactsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Add Members ({selectedUsers.length})
              </Text>
            </View>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedUsersSection}>
                <FlatList
                  data={selectedUsers}
                  renderItem={renderSelectedUser}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.selectedUsersList}
                />
              </View>
            )}

            {/* Search Input */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search users by name or email"
                  placeholderTextColor="#8E8E93"
                  accessibilityLabel="Search users"
                  accessibilityHint="Type to search for users to add to your group"
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoader} />
                )}
              </View>
            </View>

            {/* Search Results */}
            {searchQuery.trim() && (
              <View style={styles.searchResultsSection}>
                {searchError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{searchError}</Text>
                  </View>
                ) : isSearching ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Searching users...</Text>
                  </View>
                ) : users.length > 0 ? (
                  <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.id}
                    style={styles.searchResultsList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  />
                ) : searchQuery.trim().length >= 3 ? (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No users found</Text>
                    <Text style={styles.noResultsSubtext}>Try searching with a different name or email</Text>
                  </View>
                ) : (
                  <View style={styles.minimumLengthContainer}>
                    <Text style={styles.minimumLengthText}>Type at least 3 characters to search</Text>
                  </View>
                )}
              </View>
            )}

            {/* Instructions */}
            {!searchQuery.trim() && (
              <View style={styles.instructionsContainer}>
                <Ionicons name="search" size={48} color="#C7C7CC" />
                <Text style={styles.instructionsText}>
                  Search for users to add to your group
                </Text>
                <Text style={styles.instructionsSubtext}>
                  Type a name or email address to find users
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sticky Bottom Create Button */}
        <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={handleCreateGroup}
            disabled={!isCreateEnabled}
            style={[
              styles.createButton,
              !isCreateEnabled && styles.createButtonDisabled
            ]}
            accessibilityLabel={isCreateEnabled ? "Create group" : "Create group (disabled - requires group name and at least one member)"}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isCreateEnabled }}
          >
            {isCreating || isCreatingGroup ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[
                styles.createButtonText,
                !isCreateEnabled && styles.createButtonTextDisabled
              ]}>
                Create Group
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Space for bottom button
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#8E8E93',
  },
  groupNameSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  contactsSection: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    minHeight: 60,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  
  // Selected users styles
  selectedUsersSection: {
    marginBottom: 16,
  },
  selectedUsersList: {
    maxHeight: 50,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedUserText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 6,
  },
  removeUserButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  
  // Search styles
  searchSection: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  searchLoader: {
    marginLeft: 8,
  },
  
  // Search results styles
  searchResultsSection: {
    flex: 1,
    minHeight: 200,
  },
  searchResultsList: {
    flex: 1,
  },
  
  // Error and no results styles
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 8,
  },
  minimumLengthContainer: {
    padding: 20,
    alignItems: 'center',
  },
  minimumLengthText: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
  
  // Instructions styles
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  instructionsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  instructionsSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});
