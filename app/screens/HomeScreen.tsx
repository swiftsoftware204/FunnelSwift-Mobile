import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, AppState, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';
import TagsManager from '../components/TagsManager';
import QuickCaptureModal from '../components/QuickCaptureModal';
import CampaignsPicker from '../components/CampaignsPicker';

export default function HomeScreen({ navigation }: any) {
  const { user, isSuperAdmin } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Check for offline leads and try to sync
  useEffect(() => {
    checkPendingLeads();
    
    // Auto-sync when app comes to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPendingLeads();
      }
    });
    return () => sub.remove();
  }, []);

  // Refresh when returning to this screen
  useFocusEffect(
    useCallback(() => {
      refreshStats();
      checkPendingLeads();
    }, [])
  );

  async function refreshStats() {
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
  }

  async function checkPendingLeads() {
    try {
      const pending = await http.getPendingLeads();
      setPendingCount(pending.length);
      
      // Auto-sync if there are pending leads
      if (pending.length > 0 && !syncing) {
        setSyncing(true);
        const result = await http.syncOfflineLeads();
        if (result.synced > 0) {
          const remaining = await http.getPendingLeads();
          setPendingCount(remaining.length);
          refreshStats();
        }
        setSyncing(false);
      }
    } catch {
      // silent
    }
  }

  async function handleQuickCaptured() {
    refreshStats();
    checkPendingLeads();
  }

  async function handleCreateTag(tagName: string) {
    try {
      await http.createTag({ name: tagName });
      // Tag synced to CoreSwift automatically
    } catch {
      // silent — tag will be available on next sync
    }
  }

  async function handleShareApp() {
    try {
      await Share.share({
        message: 'Try FunnelSwift — capture leads, track campaigns, and grow your business on the go! https://funnelswift.net/download-app',
        url: 'https://funnelswift.net/download-app',
      });
    } catch { /* silent */ }
  }

  const quickActions = [
    {
      icon: 'qr-code' as const,
      title: 'QR Codes',
      description: 'Your QR codes for scanning',
      onPress: () => navigation.navigate('KineticCards', { tab: 'qrs' }),
      color: '#F59E0B',
    },
    {
      icon: 'flash' as const,
      title: 'Kinetic Cards & Bio Links',
      description: 'Bio-links, mini-pages, business cards',
      onPress: () => navigation.navigate('KineticCards'),
      color: colors.primary,
    },
    {
      icon: 'megaphone' as const,
      title: 'Campaigns',
      description: 'Share a campaign link via text or email',
      onPress: () => setShowCampaigns(true),
      color: '#EC4899',
    },
  ];

  return (
    <>
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {user?.name || user?.email?.split('@')[0] || 'User'}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isSuperAdmin ? 'Admin' : 'Sales Rep'}
            </Text>
          </View>
          
          {/* Pending sync badge */}
          {pendingCount > 0 && (
            <TouchableOpacity
              style={styles.pendingBadge}
              onPress={checkPendingLeads}
            >
              <Ionicons name="cloud-upload" size={16} color="#FBBF24" />
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </TouchableOpacity>
          )}
          
          {syncing && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>↻</Text>
            </View>
          )}
          
          <TouchableOpacity onPress={handleShareApp} style={{ marginRight: 12 }}>
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
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

    {/* Floating Action Button — Quick Capture */}
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary }]}
      onPress={() => setShowQuickCapture(true)}
      activeOpacity={0.8}
    >
      <Ionicons name="flash" size={28} color="#fff" />
    </TouchableOpacity>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        visible={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        onCaptured={handleQuickCaptured}
      />

      {/* Campaigns Picker Modal */}
      <CampaignsPicker
        visible={showCampaigns}
        onClose={() => setShowCampaigns(false)}
      />

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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#78350F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
    gap: 4,
  },
  pendingBadgeText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
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
