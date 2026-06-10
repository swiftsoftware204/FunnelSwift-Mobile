import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { Lead } from '../../lib/supabase';

export default function LeadDetailScreen({ route }: any) {
  const { lead } = route.params as { lead: Lead };
  const { colors } = useTheme();

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

  async function callPhone() {
    if (lead.phone) {
      await Linking.openURL(`tel:${lead.phone}`);
    }
  }

  async function sendEmail() {
    if (lead.email) {
      await Linking.openURL(`mailto:${lead.email}`);
    }
  }

  async function openWebsite() {
    if (lead.website) {
      await Linking.openURL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.businessName, { color: colors.text }]}>
          {lead.business_name || 'Unknown Business'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
            {lead.status}
          </Text>
        </View>
        <Text style={[styles.leadScore, { color: colors.primary }]}>
          Lead Score: {lead.lead_score}/100
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {lead.first_name} {lead.last_name}
            </Text>
          </View>

          {lead.phone && (
            <TouchableOpacity style={styles.infoRow} onPress={callPhone}>
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>{lead.phone}</Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {lead.email && (
            <TouchableOpacity style={styles.infoRow} onPress={sendEmail}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>{lead.email}</Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {lead.website && (
            <TouchableOpacity style={styles.infoRow} onPress={openWebsite}>
              <Ionicons name="globe" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>{lead.website}</Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {lead.industry && (
            <View style={styles.infoRow}>
              <Ionicons name="business" size={20} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.text }]}>{lead.industry}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Lead Details</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={20} color={colors.textMuted} />
            <Text style={[styles.label, { color: colors.textMuted }]}>Source:</Text>
            <Text style={[styles.value, { color: colors.text }]}>{lead.source}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color={colors.textMuted} />
            <Text style={[styles.label, { color: colors.textMuted }]}>Captured:</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {new Date(lead.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {lead.notes && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.notesText, { color: colors.text }]}>{lead.notes}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Call Now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.success }]}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]}>
          <Ionicons name="mail" size={20} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Email</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leadScore: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginLeft: 12,
    width: 80,
  },
  value: {
    fontSize: 14,
    flex: 1,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
