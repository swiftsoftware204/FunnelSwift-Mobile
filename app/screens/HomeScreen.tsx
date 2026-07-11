import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';
import TagsManager from '../components/TagsManager';

export default function HomeScreen({ navigation }: any) {
  const { user, isSuperAdmin } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await http.getDashboardStats();
        if (data) {
          setStats({
            total: data.total_leads || data.total || 0,
            today: data.today_leads || data.today || 0,
            week: data.week_leads || data.week || 0,
          });
        }
      } catch {
        // silent
      }
    })();
  }, []);

  const quickActions = [
    {
      icon: 'add-circle' as const,
      title: 'Capture Lead',
      description: 'Add new business lead',
      onPress: () => navigation.navigate('Capture'),
      color: colors.primary,
    },
    {
      icon: 'people' as const,
      title: 'View Leads',
      description: 'See all captured leads',
      onPress: () => navigation.navigate('Leads'),
      color: colors.success,
    },
  ];

  return (
    <>
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {user?.email?.split('@')[0] || 'User'}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isSuperAdmin ? 'Admin' : 'Sales Rep'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.today}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{stats.week}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>This Week</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

      {quickActions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={action.onPress}
        >
          <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
            <Ionicons name={action.icon} size={26} color={action.color} />
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
            <Text style={[styles.actionDescription, { color: colors.textMuted }]}>
              {action.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettings(false)}>
        <View style={[styles.settingsScreen, { backgroundColor: colors.background }]}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.settingsTitle, { color: colors.text }]}>Settings</Text>
            <View style={{ width: 28 }} />
          </View>

          <TouchableOpacity
            style={[styles.settingsItem, { backgroundColor: colors.surface }]}
            onPress={() => { setShowSettings(false); setShowTagsManager(true); }}
          >
            <View style={[styles.settingsIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="pricetags" size={22} color={colors.primary} />
            </View>
            <View style={styles.settingsItemInfo}>
              <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Manage Tags</Text>
              <Text style={[styles.settingsItemDesc, { color: colors.textMuted }]}>Add, delete tag groups and tags</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Tags Manager Modal */}
      <Modal visible={showTagsManager} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTagsManager(false)}>
        <TagsManager onClose={() => setShowTagsManager(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  settingsScreen: { flex: 1 },
  settingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
  },
  settingsTitle: { fontSize: 20, fontWeight: '700' },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, gap: 14,
  },
  settingsIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingsItemInfo: { flex: 1 },
  settingsItemTitle: { fontSize: 16, fontWeight: '600' },
  settingsItemDesc: { fontSize: 12, marginTop: 2 },
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 4 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 12,
  },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionText: { flex: 1, marginLeft: 14 },
  actionTitle: { fontSize: 16, fontWeight: '600' },
  actionDescription: { fontSize: 13, marginTop: 2 },
});
