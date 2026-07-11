import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
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

  function renderLead({ item }: { item: any }) {
    const tags: string[] = item.tags ? (Array.isArray(item.tags) ? item.tags : []) : [];
    const displayName = item.name || item.email || 'Unknown';
    const stage = item.stage || item.status || 'New';

    return (
      <TouchableOpacity
        style={[styles.leadCard, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('LeadDetail', { lead: item })}
      >
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <Text style={[styles.leadName, { color: colors.text }]}>{displayName}</Text>
            {item.company && (
              <Text style={[styles.companyName, { color: colors.textMuted }]}>{item.company}</Text>
            )}
          </View>
          <View style={[styles.stageBadge, { backgroundColor: getStageColor(stage) + '20' }]}>
            <Text style={[styles.stageText, { color: getStageColor(stage) }]}>{stage}</Text>
          </View>
        </View>

        <View style={styles.leadDetails}>
          {item.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call" size={14} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.phone}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={14} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.email}</Text>
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
          {item.score != null && (
            <Text style={[styles.scoreText, { color: colors.primary }]}>Score: {item.score}</Text>
          )}
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
          </Text>
        </View>
      </TouchableOpacity>
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
        renderItem={renderLead}
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
