import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';

export interface Tag {
  id: string;
  name: string;
  displayName?: string;
  color: string;
  group: string;
  groupId?: string;
  icon?: string;
  system?: boolean;
}

interface TagGroup {
  groupId: string;
  groupName: string;
  groupColor: string;
  groupIcon: string;
  tags: Tag[];
}

interface Props {
  visible: boolean;
  selectedTags: string[];
  onToggleTag: (tagName: string) => void;
  onClose: () => void;
  availableTags?: Tag[]; // Dynamic tags from API — primary source
  systemTags?: Tag[]; // Fallback if no API tags
  customTags?: Tag[];
  onCreateTag?: (tagName: string) => void; // Callback for creating a new tag
}

const FALLBACK_TAGS: Tag[] = [
  { id: 't1', name: 'Hot Lead', color: '#EF4444', group: 'Priority' },
  { id: 't2', name: 'Warm Lead', color: '#F59E0B', group: 'Priority' },
  { id: 't3', name: 'Cold Lead', color: '#6B7280', group: 'Priority' },
  { id: 't4', name: 'Call Back', color: '#3B82F6', group: 'Action' },
  { id: 't5', name: 'Follow Up', color: '#8B5CF6', group: 'Action' },
  { id: 't6', name: 'Meeting Set', color: '#10B981', group: 'Action' },
  { id: 't7', name: 'Interested', color: '#06B6D4', group: 'Status' },
  { id: 't8', name: 'Not Interested', color: '#EC4899', group: 'Status' },
  { id: 't9', name: 'Decision Maker', color: '#F97316', group: 'Role' },
  { id: 't10', name: 'Gatekeeper', color: '#A855F7', group: 'Role' },
  { id: 't11', name: 'Referral', color: '#14B8A6', group: 'Source' },
  { id: 't12', name: 'Event Lead', color: '#6366F1', group: 'Source' },
];

export default function TagSelector({
  visible,
  selectedTags,
  onToggleTag,
  onClose,
  availableTags,
  systemTags,
  customTags = [],
  onCreateTag,
}: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [groupedTags, setGroupedTags] = useState<TagGroup[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const newTagInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Determine which tags to use: API dynamic tags first, then fallback
    let tagsToUse: Tag[];

    if (availableTags && availableTags.length > 0) {
      tagsToUse = availableTags;
    } else {
      tagsToUse = [...(systemTags || FALLBACK_TAGS), ...customTags];
    }

    // Apply search filter
    const filtered = search
      ? tagsToUse.filter(t =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.displayName?.toLowerCase().includes(search.toLowerCase()))
        )
      : tagsToUse;

    // Group tags
    const groupMap = new Map<string, TagGroup>();

    filtered.forEach(tag => {
      const groupKey = tag.groupId || tag.group;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupId: tag.groupId || groupKey,
          groupName: tag.group,
          groupColor: '#64748B',
          groupIcon: '🔖',
          tags: [],
        });
      }
      groupMap.get(groupKey)!.tags.push(tag);
    });

    setGroupedTags(Array.from(groupMap.values()));
  }, [search, availableTags, systemTags, customTags]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Select Tags</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Search tags..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />

          {/* New Tag Input */}
          {onCreateTag && (
            <View style={[styles.newTagRow, { borderColor: colors.border }]}>
              {showNewTagInput ? (
                <>
                  <TextInput
                    ref={newTagInputRef}
                    style={[styles.newTagInput, {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.primary,
                      color: colors.text,
                    }]}
                    placeholder="New tag name..."
                    placeholderTextColor={colors.textMuted}
                    value={newTagName}
                    onChangeText={setNewTagName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (newTagName.trim()) {
                        onCreateTag(newTagName.trim());
                        setNewTagName('');
                        setShowNewTagInput(false);
                      }
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (newTagName.trim()) {
                        onCreateTag(newTagName.trim());
                        setNewTagName('');
                        setShowNewTagInput(false);
                      }
                    }}
                    style={[styles.newTagConfirmBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowNewTagInput(false);
                      setNewTagName('');
                    }}
                    style={styles.newTagCancelBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.newTagButton}
                  onPress={() => {
                    setShowNewTagInput(true);
                    setTimeout(() => newTagInputRef.current?.focus(), 100);
                  }}
                >
                  <Ionicons name="add-circle" size={20} color={colors.primary} />
                  <Text style={[styles.newTagButtonText, { color: colors.primary }]}>New Tag</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView style={styles.tagList}>
            {groupedTags.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="pricetags-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {search ? 'No tags match your search' : 'No tags available'}
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  {search ? 'Try a different search term' : 'Tags can be managed from the web app'}
                </Text>
              </View>
            )}
            {groupedTags.map(group => (
              <View key={group.groupId} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupIcon]}>{group.groupIcon}</Text>
                  <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
                    {group.groupName}
                  </Text>
                </View>
                <View style={styles.tagRow}>
                  {group.tags.map(tag => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.tag,
                          {
                            backgroundColor: isSelected ? tag.color : colors.surfaceLight,
                            borderColor: isSelected ? tag.color : colors.border,
                          },
                        ]}
                        onPress={() => onToggleTag(tag.name)}
                      >
                        {tag.icon && (
                          <Text style={styles.tagIcon}>{tag.icon}</Text>
                        )}
                        <Text
                          style={[
                            styles.tagText,
                            { color: isSelected ? '#fff' : colors.text },
                          ]}
                        >
                          {tag.displayName || tag.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Text style={[styles.selectedCount, { color: colors.textMuted }]}>
              {selectedTags.length} tag(s) selected
            </Text>
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 16,
  },
  tagList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  group: {
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  groupIcon: {
    fontSize: 14,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  tagIcon: {
    fontSize: 12,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  selectedCount: {
    fontSize: 14,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  newTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  newTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  newTagButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  newTagInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  newTagConfirmBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTagCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
