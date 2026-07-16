import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

type FilterStage = 'all' | 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

const FILTERS: { key: FilterStage; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'New', label: 'New' },
  { key: 'Contacted', label: 'Contacted' },
  { key: 'Qualified', label: 'Qualified' },
  { key: 'Proposal', label: 'Proposal' },
  { key: 'Closed Won', label: 'Won' },
  { key: 'Closed Lost', label: 'Lost' },
];

function getStageColor(stage: string) {
  switch (stage) {
    case 'New': return '#5B4FFF';
    case 'Contacted': return '#F59E0B';
    case 'Qualified': return '#22C55E';
    case 'Proposal': return '#8B5CF6';
    case 'Negotiation': return '#3B82F6';
    case 'Closed Won': return '#22C55E';
    case 'Closed Lost': return '#EF4444';
    default: return '#94A3B8';
  }
}

export default function LeadsScreen({ navigation }: any) {
  const [leads, setLeads] = useState<any[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStage>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();

  const fetchLeads = useCallback(async () => {
    try {
      const response = await http.getLeads({ per_page: 50 });
      const list = response.data || response || [];
      setLeads(Array.isArray(list) ? list : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    let filtered = [...leads];
    if (activeFilter !== 'all') {
      filtered = filtered.filter(l => l.stage === activeFilter || l.status === activeFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        (l.name?.toLowerCase().includes(q)) ||
        (l.email?.toLowerCase().includes(q)) ||
        (l.phone?.toLowerCase().includes(q)) ||
        (l.company?.toLowerCase().includes(q))
      );
    }
    setFilteredLeads(filtered);
  }, [leads, activeFilter, searchQuery]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  }

  // ── Swipeable Lead Card ──
  function SwipeableLeadCard({ lead }: { lead: any }) {
    const translateX = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = 80;
    const ACTION_WIDTH = 72;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) {
            translateX.setValue(Math.max(gesture.dx, -ACTION_WIDTH * 3 - 12));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -SWIPE_THRESHOLD) {
            Animated.spring(translateX, {
              toValue: -ACTION_WIDTH * 3 - 12,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        },
      })
    ).current;

    function closeSwipe() {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }

    const tags: string[] = lead.tags ? (Array.isArray(lead.tags) ? lead.tags : []) : [];
    const displayName = lead.name || lead.email || 'Unknown';
    const stage = lead.stage || lead.status || 'New';

    return (
      <View style={styles.swipeContainer}>
        {/* Action Buttons Behind Card */}
        <View style={styles.swipeActions}>
          {lead.phone && (
            <TouchableOpacity
              style={[styles.swipeAction, { backgroundColor: '#22C55E' }]}
              onPress={() => { Linking.openURL(`sms:${lead.phone}`); closeSwipe(); }}
            >
              <Ionicons name="chatbubble" size={22} color="#fff" />
              <Text style={styles.swipeActionText}>Text</Text>
            </TouchableOpacity>
          )}
          {lead.email && (
            <TouchableOpacity
              style={[styles.swipeAction, { backgroundColor: '#5B4FFF' }]}
              onPress={() => { Linking.openURL(`mailto:${lead.email}`); closeSwipe(); }}
            >
              <Ionicons name="mail" size={22} color="#fff" />
              <Text style={styles.swipeActionText}>Email</Text>
            </TouchableOpacity>
          )}
          {lead.phone && (
            <TouchableOpacity
              style={[styles.swipeAction, { backgroundColor: '#3B82F6' }]}
              onPress={() => { Linking.openURL(`tel:${lead.phone}`); closeSwipe(); }}
            >
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={styles.swipeActionText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card */}
        <Animated.View
          style={[
            styles.leadCard,
            { backgroundColor: colors.surface, transform: [{ translateX }] },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('LeadDetail', { lead })}
          >
            <View style={styles.leadHeader}>
              <View style={styles.leadInfo}>
                <Text style={[styles.leadName, { color: colors.text }]}>{displayName}</Text>
                {lead.company && (
                  <Text style={[styles.companyName, { color: colors.textMuted }]}>{lead.company}</Text>
                )}
              </View>
              <View style={[styles.stageBadge, { backgroundColor: getStageColor(stage) + '20' }]}>
                <Text style={[styles.stageText, { color: getStageColor(stage) }]}>{stage}</Text>
              </View>
            </View>

            <View style={styles.leadDetails}>
              {lead.phone && (
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={14} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.textMuted }]}>{lead.phone}</Text>
                </View>
              )}
              {lead.email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail" size={14} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.textMuted }]}>{lead.email}</Text>
                </View>
              )}
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.slice(0, 3).map((tag: string) => (
                  <View key={tag} style={[styles.miniTag, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.miniTagText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
                {tags.length > 3 && (
                  <Text style={[styles.moreTags, { color: colors.textMuted }]}>+{tags.length - 3}</Text>
                )}
              </View>
            )}

            <View style={styles.leadFooter}>
              {lead.score != null && (
                <Text style={[styles.scoreText, { color: colors.primary }]}>Score: {lead.score}</Text>
              )}
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search leads..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: filter }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === filter.key ? colors.primary : colors.surface,
                  borderColor: activeFilter === filter.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={[
                styles.filterChipText,
                { color: activeFilter === filter.key ? '#fff' : colors.text },
              ]}>{filter.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredLeads}
        renderItem={({item}) => <SwipeableLeadCard lead={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'No leads match your search' : 'No Leads Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {searchQuery ? 'Try a different search term' : 'Start capturing leads from the Capture tab'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  swipeContainer: { marginBottom: 10, position: 'relative' },
  swipeActions: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 4,
  },
  swipeAction: {
    width: 68, height: '100%',
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 8, marginLeft: 4,
  },
  swipeActionText: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 2 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 12, height: 42,
    borderRadius: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, height: 42 },
  filterRow: { marginVertical: 8 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16 },
  leadCard: { padding: 14, borderRadius: 12, marginBottom: 10 },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 16, fontWeight: '600' },
  companyName: { fontSize: 13, marginTop: 2 },
  stageBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  stageText: { fontSize: 11, fontWeight: '600' },
  leadDetails: { marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  detailText: { marginLeft: 6, fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  miniTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  miniTagText: { fontSize: 10, fontWeight: '500' },
  moreTags: { fontSize: 10, alignSelf: 'center' },
  leadFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2e3245' },
  scoreText: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 11 },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 6, textAlign: 'center' },
});
