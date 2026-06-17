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
import { supabase, Lead } from '../../lib/supabase';

type FilterStatus = 'all' | 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
];

export default function LeadsScreen({ navigation }: any) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [leadTags, setLeadTags] = useState<Record<string, string[]>>({});
  const { colors } = useTheme();

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leads, activeFilter, searchQuery]);

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data);
      // Fetch tags for all leads
      const leadIds = data.map(l => l.id);
      if (leadIds.length > 0) {
        const { data: tags } = await supabase
          .from('contact_tags')
          .select('contact_id, tag_name')
          .in('contact_id', leadIds);
        
        if (tags) {
          const tagMap: Record<string, string[]> = {};
          tags.forEach(t => {
            if (!tagMap[t.contact_id]) tagMap[t.contact_id] = [];
            tagMap[t.contact_id].push(t.tag_name);
          });
          setLeadTags(tagMap);
        }
      }
    }
    setLoading(false);
  }

  function applyFilters() {
    let filtered = [...leads];

    // Status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(l => l.status === activeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        (l.business_name?.toLowerCase().includes(q)) ||
        (l.first_name?.toLowerCase().includes(q)) ||
        (l.last_name?.toLowerCase().includes(q)) ||
        (l.email?.toLowerCase().includes(q)) ||
        (l.phone?.toLowerCase().includes(q))
      );
    }

    setFilteredLeads(filtered);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'new': return colors.primary;
      case 'contacted': return colors.warning;
      case 'qualified': return colors.success;
      case 'converted': return '#22C55E';
      case 'lost': return colors.error;
      default: return colors.textMuted;
    }
  }

  function renderLead({ item }: { item: Lead }) {
    const tags = leadTags[item.id] || [];
    return (
      <TouchableOpacity
        style={[styles.leadCard, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('LeadDetail', { lead: item })}
      >
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <Text style={[styles.businessName, { color: colors.text }]}>
              {item.business_name || 'Unknown Business'}
            </Text>
            <Text style={[styles.contactName, { color: colors.textMuted }]}>
              {item.first_name} {item.last_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.leadDetails}>
          {item.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call" size={16} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.phone}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={16} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.email}</Text>
            </View>
          )}
          {item.industry && (
            <View style={styles.detailRow}>
              <Ionicons name="business" size={16} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textMuted }]}>{item.industry}</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.slice(0, 3).map(tag => (
              <View key={tag} style={[styles.miniTag, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.miniTagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
            {tags.length > 3 && (
              <Text style={[styles.moreTags, { color: colors.textMuted }]}>
                +{tags.length - 3}
              </Text>
            )}
          </View>
        )}

        <View style={styles.leadFooter}>
          <Text style={[styles.scoreText, { color: colors.primary }]}>
            Score: {item.lead_score}/100
          </Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {new Date(item.created_at).toLocaleDateString()}
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
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search leads..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
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
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === filter.key ? '#fff' : colors.text },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredLeads}
        renderItem={renderLead}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery ? 'No leads match your search' : 'No Leads Yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {searchQuery
                ? 'Try a different search term'
                : 'Start capturing leads by tapping the Capture tab'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 44,
  },
  filterRow: {
    marginVertical: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  leadCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
  },
  contactName: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leadDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 11,
    alignSelf: 'center',
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2e3245',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
