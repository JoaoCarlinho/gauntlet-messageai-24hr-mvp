import React, { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Mock data for contacts
const mockContacts = [
  { id: '1', name: 'John Doe', email: 'john@example.com', isSelected: false },
  { id: '2', name: 'Sarah Wilson', email: 'sarah@example.com', isSelected: false },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com', isSelected: false },
  { id: '4', name: 'Emily Davis', email: 'emily@example.com', isSelected: false },
  { id: '5', name: 'Alex Brown', email: 'alex@example.com', isSelected: false },
];

export default function NewGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [contacts, setContacts] = useState(mockContacts);
  const [isCreating, setIsCreating] = useState(false);

  const selectedContacts = contacts.filter(contact => contact.isSelected);

  const handleContactToggle = (contactId: string) => {
    setContacts(prev =>
      prev.map(contact =>
        contact.id === contactId
          ? { ...contact, isSelected: !contact.isSelected }
          : contact
      )
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedContacts.length < 2) {
      Alert.alert('Error', 'Please select at least 2 contacts');
      return;
    }

    setIsCreating(true);
    try {
      // TODO: Create group via API
      console.log('Creating group:', {
        name: groupName,
        members: selectedContacts.map(c => c.id),
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        'Group created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // TODO: Navigate to the new group chat
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderContact = ({ item }: { item: typeof mockContacts[0] }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactToggle(item.id)}
    >
      <View style={styles.contactInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactEmail}>{item.email}</Text>
        </View>
      </View>
      <View style={[
        styles.checkbox,
        item.isSelected && styles.checkboxSelected
      ]}>
        {item.isSelected && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || selectedContacts.length < 2 || isCreating}
          style={[
            styles.createButton,
            (!groupName.trim() || selectedContacts.length < 2 || isCreating) && styles.createButtonDisabled
          ]}
        >
          <Text style={[
            styles.createButtonText,
            (!groupName.trim() || selectedContacts.length < 2 || isCreating) && styles.createButtonTextDisabled
          ]}>
            {isCreating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.groupNameSection}>
          <Text style={styles.sectionTitle}>Group Name</Text>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name"
            maxLength={50}
          />
        </View>

        <View style={styles.contactsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Add Members ({selectedContacts.length})
            </Text>
          </View>

          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            style={styles.contactsList}
            showsVerticalScrollIndicator={false}
          />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#8E8E93',
  },
  content: {
    flex: 1,
    padding: 16,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
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
});
