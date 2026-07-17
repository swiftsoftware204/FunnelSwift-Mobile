import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface QuickCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCaptured?: () => void;
}

export default function QuickCaptureModal({ visible, onClose, onCaptured }: QuickCaptureModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { colors } = useTheme();

  async function handleCapture() {
    if (!name.trim() && !phone.trim() && !email.trim()) {
      Alert.alert('Quick Capture', 'Enter at least a name or phone number.');
      return;
    }

    setSubmitting(true);

    // Split name into first/last (everything after first space = last name)
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const payload: Record<string, any> = {
      source: 'Quick Add',
    };
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (phone.trim()) payload.phone = phone.trim();
    if (email.trim()) payload.email = email.trim();

    try {
      // Try online first
      await http.createLead(payload);
      onCaptured?.();
      resetForm();
      onClose();
    } catch (err: any) {
      // If network error, save offline
      if (err.message?.includes('Network') || err.message?.includes('fetch') || err.name === 'ApiError' && err.status === 0) {
        await http.addPendingLead(payload);
        Alert.alert('Saved Offline', 'Lead will sync when you\'re back online.');
        onCaptured?.();
        resetForm();
        onClose();
      } else {
        Alert.alert('Error', err.message || 'Failed to save lead.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName('');
    setPhone('');
    setEmail('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Quick Capture</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Name, phone, or email — tap to save
          </Text>

          {/* Name */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
            placeholder="Full Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
          />

          {/* Phone */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
            placeholder="Phone Number"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          {/* Email */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text }]}
            placeholder="Email (optional)"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
          />

          {/* Capture Button */}
          <TouchableOpacity
            style={[styles.captureBtn, { backgroundColor: colors.primary }]}
            onPress={handleCapture}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.captureBtnText}>Capture Lead</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  captureBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
