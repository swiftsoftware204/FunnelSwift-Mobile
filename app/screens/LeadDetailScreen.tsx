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
import * as http from '../../lib/http';
import TagSelector from '../components/TagSelector';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

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

const FIELD_CONFIG: Record<string, { label: string; icon: string; keyboard?: any }> = {
  name: { label: 'Full Name', icon: 'person' },
  email: { label: 'Email', icon: 'mail', keyboard: 'email-address' },
  phone: { label: 'Phone', icon: 'call', keyboard: 'phone-pad' },
  company: { label: 'Company', icon: 'business' },
  source: { label: 'Source', icon: 'flag' },
  notes: { label: 'Notes', icon: 'document-text' },
};

const ADDABLE_FIELDS: { key: string; label: string; icon: string }[] = [
  { key: 'first_name', label: 'First Name', icon: 'person' },
  { key: 'last_name', label: 'Last Name', icon: 'person' },
  { key: 'website', label: 'Website', icon: 'globe' },
  { key: 'address', label: 'Address', icon: 'location' },
  { key: 'title', label: 'Title / Position', icon: 'briefcase' },
  { key: 'social', label: 'Social (LinkedIn, etc.)', icon: 'link' },
];

export default function LeadDetailScreen({ route, navigation }: any) {
  const initialLead = route.params?.lead || {};
  const [lead, setLead] = useState<any>(initialLead);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [activeFields, setActiveFields] = useState<string[]>([]);

  function addField(key: string) {
    if (!activeFields.includes(key)) {
      setActiveFields([...activeFields, key]);
      setEditForm(f => ({ ...f, [key]: '' }));
    }
  }

  const { colors } = useTheme();


  useEffect(() => {
    fetchTagsAndPopulate();
  }, []);

  async function fetchTagsAndPopulate() {
    // Fetch tags from API
    try {
      const tags = await http.getTags();
      if (tags && tags.length > 0) {
        setAvailableTags(tags.map((t: any) => ({
          id: t.id,
          name: t.name,
          displayName: t.name,
          color: t.color || '#5B4FFF',
          group: 'Tags',
          groupId: t.group_id || 'default',
          is_system: t.is_system,
        })));
      }
    } catch {}

    // Parse existing tags
    const existingTags = lead.tags
      ? (Array.isArray(lead.tags) ? lead.tags : [])
      : [];
    setSelectedTags(existingTags);

    // Populate edit form from lead data
    setEditForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source || '',
      notes: lead.notes || '',
    });
  }

  async function fetchFreshLead() {
    try {
      if (!lead.id) return;
      const fresh = await http.getLead(lead.id);
      if (fresh) {
        setLead(fresh);
        const existingTags = fresh.tags
          ? (Array.isArray(fresh.tags) ? fresh.tags : [])
          : [];
        setSelectedTags(existingTags);
        setEditForm({
          name: fresh.name || '',
          email: fresh.email || '',
          phone: fresh.phone || '',
          company: fresh.company || '',
          source: fresh.source || '',
          notes: fresh.notes || '',
        });
      }
    } catch (e) {
      // silent — keep local state
    }
  }

  function handleToggleTag(tagName: string) {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  }

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, any> = {};

    // Only include changed fields
    if (editForm.name !== (lead.name || '')) payload.name = editForm.name;
    if (editForm.email !== (lead.email || '')) payload.email = editForm.email;
    if (editForm.phone !== (lead.phone || '')) payload.phone = editForm.phone;
    if (editForm.company !== (lead.company || '')) payload.company = editForm.company;
    if (editForm.source !== (lead.source || '')) payload.source = editForm.source;
    if (editForm.notes !== (lead.notes || '')) payload.notes = editForm.notes;

    // Dynamic addable fields
    const addableKeys = ['first_name', 'last_name', 'website', 'address', 'title', 'social'];
    for (const key of addableKeys) {
      if (editForm[key] !== undefined && editForm[key] !== '') {
        if (editForm[key] !== (lead[key] || '')) {
          payload[key] = editForm[key];
        }
      }
    }

    // Tags
    const currentTags = lead.tags ? (Array.isArray(lead.tags) ? lead.tags : []) : [];
    const tagsChanged = JSON.stringify(currentTags.sort()) !== JSON.stringify([...selectedTags].sort());
    if (tagsChanged) {
      payload.tags = selectedTags;
    }

    try {
      await http.updateLead(lead.id, payload);
      await fetchFreshLead();
      setEditing(false);
      Alert.alert('Saved', 'Lead updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update lead.');
    } finally {
      setSaving(false);
    }
  }

  const displayName = lead.name || lead.email || 'Unknown';
  const stage = lead.stage || lead.status || 'New';

  // Determine visible fields (only show what has data)
  const visibleFields = Object.entries(FIELD_CONFIG).filter(([key]) => {
    if (editing) return true; // Show all in edit mode
    return !!lead[key];
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        {editing ? (
          <TextInput
            style={[styles.editTitle, { color: colors.text, borderBottomColor: colors.border }]}
            value={editForm.name}
            onChangeText={t => setEditForm(f => ({ ...f, name: t }))}
            placeholder="Full Name"
            placeholderTextColor={colors.textMuted}
          />
        ) : (
          <Text style={[styles.leadName, { color: colors.text }]}>{displayName}</Text>
        )}

        {editing ? (
          <View style={styles.stageSelector}>
            {STAGES.map(s => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.stageOption,
                  { backgroundColor: editForm.stage === s ? getStageColor(s) : colors.surfaceLight },
                ]}
                onPress={() => setEditForm(f => ({ ...f, stage: s }))}
              >
                <Text style={[
                  styles.stageOptionText,
                  { color: editForm.stage === s ? '#fff' : colors.text },
                ]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.stageBadge, { backgroundColor: getStageColor(stage) + '20' }]}>
            <Text style={[styles.stageText, { color: getStageColor(stage) }]}>{stage}</Text>
          </View>
        )}

        {lead.score != null && (
          <Text style={[styles.score, { color: colors.primary }]}>Score: {lead.score}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {visibleFields.map(([key, config]) => {
            if (key === 'notes') return null; // Notes below
            if (editing) {
              return (
                <View key={key} style={styles.editFieldContainer}>
                  <Text style={[styles.editFieldLabel, { color: colors.textMuted }]}>{config.label}</Text>
                  <TextInput
                    style={[styles.editInput, {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.border,
                      color: colors.text,
                    }]}
                    placeholder={config.label}
                    placeholderTextColor={colors.textMuted}
                    value={editForm[key] || ''}
                    onChangeText={t => setEditForm(f => ({ ...f, [key]: t }))}
                    keyboardType={config.keyboard as any}
                    autoCapitalize="none"
                  />
                </View>
              );
            }

            const value = lead[key];
            if (!value) return null;

            const isClickable = key === 'email' || key === 'phone';
            return (
              <TouchableOpacity
                key={key}
                style={styles.infoRow}
                onPress={() => {
                  if (key === 'email') Linking.openURL(`mailto:${value}`);
                  if (key === 'phone') Linking.openURL(`tel:${value}`);
                }}
                disabled={!isClickable}
              >
                <Ionicons name={config.icon as any} size={18} color={isClickable ? colors.primary : colors.textMuted} />
                <Text style={[styles.infoText, { color: isClickable ? colors.primary : colors.text }]}>{value}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
        <TouchableOpacity
          style={[styles.card, styles.tagCard, { backgroundColor: colors.surface }]}
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
              <Text style={[styles.noTagsText, { color: colors.textMuted }]}>No tags yet — tap to add</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
        {editing ? (
          <TextInput
            style={[styles.editInput, styles.editNotes, {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Add notes..."
            placeholderTextColor={colors.textMuted}
            value={editForm.notes || ''}
            onChangeText={t => setEditForm(f => ({ ...f, notes: t }))}
            multiline
            numberOfLines={5}
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

      {/* Add Field chips --- only in edit mode */}
      {editing && (() => {
        const usedKeys = Object.keys(editForm);
        const available = ADDABLE_FIELDS.filter(f => !usedKeys.includes(f.key));
        if (available.length === 0) return null;
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Field</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, flexDirection: "row", flexWrap: "wrap", gap: 6 }]}>
              {available.map(field => (
                <TouchableOpacity
                  key={field.key}
                  style={[styles.addFieldChip, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                  onPress={() => addField(field.key)}
                >
                  <Ionicons name={field.icon} size={14} color={colors.primary} />
                  <Text style={[styles.addFieldChipText, { color: colors.text }]}>{field.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Dates */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted, fontSize: 13 }]}>
            Created: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="refresh" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted, fontSize: 13 }]}>
            Updated: {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {editing ? (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => { setEditing(false); fetchFreshLead(); }}
          >
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.actions}>
            {lead.phone && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>
            )}
            {lead.email && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => Linking.openURL(`mailto:${lead.email}`)}>
                <Ionicons name="mail" size={18} color={colors.text} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.editTrigger, { backgroundColor: colors.primary }]}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Edit Lead</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteTrigger]}
            onPress={() => {
              Alert.alert(
                'Delete Lead',
                `Are you sure you want to delete ${lead.name || 'this lead'}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await http.deleteLead(lead.id);
                        Alert.alert('Deleted', 'Lead has been deleted.');
                        navigation.goBack();
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to delete lead.');
                      }
                    }
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete Lead</Text>
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
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center' },
  leadName: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  editTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', borderBottomWidth: 1, marginBottom: 10, paddingBottom: 6, width: '100%' },
  stageBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, marginBottom: 8 },
  stageText: { fontSize: 13, fontWeight: '600' },
  stageSelector: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 10 },
  stageOption: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  stageOptionText: { fontSize: 11, fontWeight: '500' },
  score: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  card: { padding: 14, borderRadius: 10, marginBottom: 10 },
  tagCard: { flexDirection: 'row', alignItems: 'center' },
  tagRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  miniTagText: { fontSize: 11, fontWeight: '500' },
  noTagsText: { fontSize: 13 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoText: { fontSize: 14, marginLeft: 10, flex: 1 },
  notesText: { fontSize: 14, lineHeight: 22 },
  editFieldContainer: { marginBottom: 10 },
  editFieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginLeft: 2 },
  editRow: { marginBottom: 8 },
  editInput: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 15, marginBottom: 8 },
  editNotes: { height: 120, paddingTop: 10 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 16 },
  editActions: { paddingHorizontal: 16, gap: 10, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 6 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  editTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 8, gap: 6 },
  deleteTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 32, padding: 12, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: '#EF4444' },
});
