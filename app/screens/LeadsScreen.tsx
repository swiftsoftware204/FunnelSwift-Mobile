import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { supabase, Lead } from '../../lib/supabase';

export default function LeadsScreen({ navigation }: any) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
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
      <FlatList
        data={leads}
        renderItem={renderLead}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Leads Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Start capturing leads by tapping the Capture tab
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
    marginBottom: 12,
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
