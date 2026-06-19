import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { supabase, Lead } from '../../lib/supabase';
import TagSelector from '../components/TagSelector';

export default function LeadDetailScreen({ route, navigation }: any) {
  const { lead: initialLead } = route.params as { lead: Lead };
  const [lead, setLead] = useState<Lead>(initialLead);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    first_name: initialLead.first_name || '',
    last_name: initialLead.last_name || '',
    email: initialLead.email || '',
    phone: initialLead.phone || '',
    business_name: initialLead.business_name || '',
    website: initialLead.website || '',
    notes: initialLead.notes || '',
    status: initialLead.status,
  });
  const { colors } = useTheme();

  useEffect(() => {
    fetchTags();
    fetchAvailableTags();
  }, []);

  async function fetchAvailableTags() {
    const { data: tagsData } = await supabase
      .from('vw_tenant_tags_with_groups')
      .select('id, tag_name, display_name, color, icon, group_name, group_color')
      .eq('is_active', true);
    if (tagsData && tagsData.length > 0) {
      setAvailableTags(tagsData.map((t: any) => ({
        id: t.id,
        name: t.tag_name,
        displayName: t.display_name,
        color: t.color ? `#${t.color.replace('#', '')}` : '#5B4FFF',
        icon: t.icon || '',
        group: t.group_name || 'Custom',
        groupId: t.group_name || 'custom',
        is_system: true,
      })));
    }
  }

  async function fetchTags() {
    const { data } = await supabase
      .from('contact_tags')
      .select('tag_name')
      .eq('contact_id', lead.id);

    if (data) {
      setSelectedTags(data.map(t => t.tag_name));
    }
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

  const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

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

  async function handleSave() {
    setSaving(true);
    const updates = {
      first_name: editForm.first_name || null,
      last_name: editForm.last_name || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      business_name: editForm.business_name || null,
      website: editForm.website || null,
      notes: editForm.notes || null,
      status: editForm.status,
    };

    const { error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', lead.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Sync tags
      await supabase.from('contact_tags').delete().eq('contact_id', lead.id);
      if (selectedTags.length > 0) {
        const tagInserts = selectedTags.map(tagName => ({
          contact_id: lead.id,
          tag_name: tagName,
        }));
        await supabase.from('contact_tags').insert(tagInserts);
      }

      setLead({ ...lead, ...updates } as Lead);
      setEditing(false);
      Alert.alert('Saved', 'Lead updated successfully.');
    }
    setSaving(false);
  }

  function handleToggleTag(tagName: string) {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        {editing ? (
          <TextInput
            style={[styles.editTitle, { color: colors.text, borderBottomColor: colors.border }]}
            value={editForm.business_name}
            onChangeText={t => setEditForm(f => ({ ...f, business_name: t }))}
            placeholder="Business Name"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={[styles.businessName, { color: colors.text }]}>
            {lead.business_name || 'Unknown Business'}
          </Text>
        )}

        {/* Status Selector */}
        {editing ? (
          <View style={styles.statusSelector}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusOption,
                  {
                    backgroundColor: editForm.status === s ? getStatusColor(s) : colors.surfaceLight,
                  },
                ]}
                onPress={() => setEditForm(f => ({ ...f, status: s }))}
              >
                <Text style={[
                  styles.statusOptionText,
                  { color: editForm.status === s ? '#fff' : colors.text },
                ]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
              {lead.status}
            </Text>
          </View>
        )}

        <Text style={[styles.leadScore, { color: colors.primary }]}>
          Lead Score: {lead.lead_score}/100
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {editing ? (
            <>
              <View style={styles.row}>
                <TextInput
                  style={[styles.editInput, styles.halfInput, { 
                    backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text 
                  }]}
                  placeholder="First Name"
                  placeholderTextColor={colors.textMuted}
                  value={editForm.first_name}
                  onChangeText={t => setEditForm(f => ({ ...f, first_name: t }))}
                />
                <TextInput
                  style={[styles.editInput, styles.halfInput, { 
                    backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text 
                  }]}
                  placeholder="Last Name"
                  placeholderTextColor={colors.textMuted}
                  value={editForm.last_name}
                  onChangeText={t => setEditForm(f => ({ ...f, last_name: t }))}
                />
              </View>
              <TextInput
                style={[styles.editInput, { 
                  backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text 
                }]}
                placeholder="Phone"
                placeholderTextColor={colors.textMuted}
                value={editForm.phone}
                onChangeText={t => setEditForm(f => ({ ...f, phone: t }))}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.editInput, { 
                  backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text 
                }]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={editForm.email}
                onChangeText={t => setEditForm(f => ({ ...f, email: t }))}
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.editInput, { 
                  backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text 
                }]}
                placeholder="Website"
                placeholderTextColor={colors.textMuted}
                value={editForm.website}
                onChangeText={t => setEditForm(f => ({ ...f, website: t }))}
                keyboardType="url"
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
      </View>

      {/* Tags Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
        <TouchableOpacity
          style={[styles.card, styles.tagSelectorCard, { backgroundColor: colors.surface }]}
          onPress={() => setShowTagSelector(true)}
        >
          <View style={styles.tagRow}>
            {selectedTags.length > 0 ? (
              selectedTags.map(tag => (
                <View key={tag} style={[styles.miniTag, { backgroundColor: colors.primary + '30' }]}>
                  <Text style={[styles.miniTagText, { color: colors.primary }]}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.noTagsText, { color: colors.textMuted }]}>
                No tags yet — tap to add
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
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

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
        {editing ? (
          <TextInput
            style={[styles.editInput, styles.editNotes, { 
              backgroundColor: colors.surfaceLight, borderColor: colors.border, color: colors.text 
            }]}
            placeholder="Add notes..."
            placeholderTextColor={colors.textMuted}
            value={editForm.notes}
            onChangeText={t => setEditForm(f => ({ ...f, notes: t }))}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.notesText, { color: colors.text }]}>
              {lead.notes || 'No notes'}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {editing ? (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.success }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.surface }]}
            onPress={() => setEditing(false)}
          >
            <Text style={[styles.editButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary, marginHorizontal: 16, marginBottom: 32 }]}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Edit Lead</Text>
          </TouchableOpacity>
        </>
      )}

      <TagSelector
        visible={showTagSelector}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClose={() => setShowTagSelector(false)}
        availableTags={availableTags}
      />
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
  editTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 1,
    marginBottom: 12,
    paddingBottom: 8,
    width: '100%',
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
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '500',
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
  tagSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noTagsText: {
    fontSize: 14,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  editInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  editNotes: {
    height: 140,
    paddingTop: 12,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginTop: 24,
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
  editActions: {
    padding: 16,
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
