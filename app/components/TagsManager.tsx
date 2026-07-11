import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface TagGroup {
  id: string;
  name: string;
  color: string;
  tag_count?: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  group_id?: string;
  group_name?: string;
  is_system?: boolean;
}

interface Props {
  onClose: () => void;
}

export default function TagsManager({ onClose }: Props) {
  const [tab, setTab] = useState<'groups' | 'tags'>('groups');
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#5B4FFF');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#5B4FFF');
  const [newTagGroup, setNewTagGroup] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('');
  const { colors } = useTheme();

  const COLORS = ['#5B4FFF','#22c55e','#F59E0B','#ef4444','#ec4899','#06b6d4','#8b5cf6','#14b8a6'];

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [g, t] = await Promise.all([http.getTagGroups(), http.getTags()]);
      setGroups(g || []);
      setTags(t || []);
    } catch (err: any) {
      if (err.status !== 401) Alert.alert('Error', err.message || 'Failed to load tags');
    } finally { setLoading(false); }
  }

  async function createGroup() {
    if (!newGroupName.trim()) { Alert.alert('Required','Enter a name'); return; }
    try {
      await http.createTagGroup({ name: newGroupName.trim(), color: newGroupColor });
      setShowNewGroup(false); setNewGroupName(''); loadData();
    } catch (err: any) { Alert.alert('Error', err.message); }
  }

  async function deleteGroup(id: string, name: string) {
    Alert.alert('Delete Tag Group', `Delete "${name}" and all its tags?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await http.deleteTagGroup(id); loadData(); }
        catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  }

  async function createTag() {
    if (!newTagName.trim()) { Alert.alert('Required','Enter a name'); return; }
    try {
      await http.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        group_id: newTagGroup || undefined,
      });
      setShowNewTag(false); setNewTagName(''); setNewTagGroup(''); loadData();
    } catch (err: any) { Alert.alert('Error', err.message); }
  }

  async function deleteTag(id: string, name: string, isSystem?: boolean) {
    if (isSystem) {
      Alert.alert('Locked', `"${name}" is a system tag tied to SwiftSoftware plans or services and cannot be deleted.`);
      return;
    }
    Alert.alert('Delete Tag', `Delete "${name}"? It will be removed from all leads.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await http.deleteTag(id); loadData(); }
        catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredTags = filterGroup
    ? tags.filter(t => (t.group_name || '').toLowerCase() === filterGroup.toLowerCase())
    : tags;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Manage Tags</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, tab === 'groups' && styles.tabActive]}
          onPress={() => setTab('groups')}
        >
          <Text style={[styles.tabText, { color: tab === 'groups' ? colors.primary : colors.textMuted }]}>
            Tag Groups ({groups.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'tags' && styles.tabActive]}
          onPress={() => setTab('tags')}
        >
          <Text style={[styles.tabText, { color: tab === 'tags' ? colors.primary : colors.textMuted }]}>
            Tags ({tags.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tag Groups Tab */}
      {tab === 'groups' && (
        <View style={styles.listWrap}>
          {groups.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No tag groups yet. Create one to organize your tags.
            </Text>
          )}
          <FlatList
            data={groups}
            keyExtractor={g => g.id}
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.colorDot, { backgroundColor: item.color || colors.primary }]} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
                  {item.tag_count !== undefined && (
                    <Text style={[styles.rowCount, { color: colors.textMuted }]}>{item.tag_count} tags</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => deleteGroup(item.id, item.name)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />

          {showNewGroup ? (
            <View style={[styles.newForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Group name" placeholderTextColor={colors.textMuted}
                value={newGroupName} onChangeText={setNewGroupName}
              />
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorSwatch, { backgroundColor: c }, newGroupColor === c && styles.colorSelected]}
                    onPress={() => setNewGroupColor(c)}
                  />
                ))}
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => setShowNewGroup(false)}>
                  <Text style={[styles.cancelBtn, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={createGroup}>
                  <Text style={styles.saveBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addRow} onPress={() => setShowNewGroup(true)}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <Text style={[styles.addText, { color: colors.primary }]}>Add Tag Group</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tags Tab */}
      {tab === 'tags' && (
        <View style={styles.listWrap}>
          {/* Filter by group */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !filterGroup && { backgroundColor: colors.primary + '20' }]}
              onPress={() => setFilterGroup('')}
            >
              <Text style={[styles.filterText, !filterGroup && { color: colors.primary }]}>All</Text>
            </TouchableOpacity>
            {groups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.filterChip, filterGroup === g.name && { backgroundColor: colors.primary + '20' }]}
                onPress={() => setFilterGroup(filterGroup === g.name ? '' : g.name)}
              >
                <Text style={[styles.filterText, filterGroup === g.name && { color: colors.primary }]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredTags.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tags in this group.</Text>
          )}
          <FlatList
            data={filteredTags}
            keyExtractor={t => t.id}
            renderItem={({ item }) => (
              <View style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.colorDot, { backgroundColor: item.color || colors.primary }]} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
                  {item.group_name && (
                    <Text style={[styles.rowCount, { color: colors.textMuted }]}>{item.group_name}</Text>
                  )}
                </View>
                {item.is_system ? (
                  <View style={styles.systemBadge}>
                    <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                    <Text style={[styles.systemText, { color: colors.textMuted }]}>System</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => deleteTag(item.id, item.name, item.is_system)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />

          {showNewTag ? (
            <View style={[styles.newForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Tag name" placeholderTextColor={colors.textMuted}
                value={newTagName} onChangeText={setNewTagName}
              />
              <View style={styles.colorRow}>
                {COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorSwatch, { backgroundColor: c }, newTagColor === c && styles.colorSelected]}
                    onPress={() => setNewTagColor(c)}
                  />
                ))}
              </View>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Tag Group name (optional)" placeholderTextColor={colors.textMuted}
                value={newTagGroup} onChangeText={setNewTagGroup}
              />
              <View style={styles.formActions}>
                <TouchableOpacity onPress={() => setShowNewTag(false)}>
                  <Text style={[styles.cancelBtn, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={createTag}>
                  <Text style={styles.saveBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addRow} onPress={() => setShowNewTag(true)}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <Text style={[styles.addText, { color: colors.primary }]}>Add Tag</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#5B4FFF' },
  tabText: { fontSize: 14, fontWeight: '600' },
  listWrap: { flex: 1, padding: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 40, lineHeight: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 10, marginBottom: 6, gap: 12,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '500' },
  rowCount: { fontSize: 12, marginTop: 2 },
  systemBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  systemText: { fontSize: 11 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, gap: 6, marginTop: 4,
  },
  addText: { fontSize: 14, fontWeight: '600' },
  newForm: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8, gap: 12 },
  formInput: { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  colorSelected: { borderWidth: 3, borderColor: '#fff' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { fontSize: 14, fontWeight: '500', paddingVertical: 8, paddingHorizontal: 8 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '500' },
});
