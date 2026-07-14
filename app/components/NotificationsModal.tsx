import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface Props {
  onClose: () => void;
}

export default function NotificationsModal({ onClose }: Props) {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    newLeadEmail: true,
    newLeadPush: true,
    dailyDigest: false,
    weeklyReport: true,
    marketingEmails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await http.getSettings();
      if (data && typeof data === 'object') {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch {
      // Settings endpoint may not exist — use defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(key: string, value: boolean) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    setSaving(true);
    try {
      await http.updateSettings({ [key]: value });
    } catch (err: any) {
      // Revert on failure
      setSettings(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Error', err.message || 'Failed to update setting.');
    } finally {
      setSaving(false);
    }
  }

  const notificationItems = [
    {
      key: 'newLeadEmail',
      icon: 'mail' as const,
      title: 'New Lead Email',
      description: 'Get an email when a new lead is captured',
    },
    {
      key: 'newLeadPush',
      icon: 'notifications' as const,
      title: 'Push Notifications',
      description: 'Push notification when a lead is captured',
    },
    {
      key: 'dailyDigest',
      icon: 'calendar' as const,
      title: 'Daily Digest',
      description: 'Daily summary of all captured leads',
    },
    {
      key: 'weeklyReport',
      icon: 'bar-chart' as const,
      title: 'Weekly Report',
      description: 'Weekly stats and performance report',
    },
    {
      key: 'marketingEmails',
      icon: 'megaphone' as const,
      title: 'Marketing & Updates',
      description: 'Product updates, tips, and promotions',
    },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          <View style={{ width: 28 }} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
        {!saving && <View style={{ width: 28 }} />}
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          Manage your notification preferences
        </Text>

        {notificationItems.map(item => (
          <View key={item.key} style={[styles.settingRow, { backgroundColor: colors.surface }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              </View>
            </View>
            <Switch
              value={settings[item.key] ?? false}
              onValueChange={val => handleToggle(item.key, val)}
              trackColor={{ false: '#444', true: colors.primary + '80' }}
              thumbColor={settings[item.key] ? colors.primary : '#888'}
            />
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, marginBottom: 16 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingText: { marginLeft: 12, flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});
