import React, { useState, useEffect } from 'react';
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
  color: string;
  group: string;
  system?: boolean;
}

interface Props {
  visible: boolean;
  selectedTags: string[];
  onToggleTag: (tagName: string) => void;
  onClose: () => void;
  systemTags?: Tag[];
  customTags?: Tag[];
}

const SYSTEM_TAGS: Tag[] = [
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
  systemTags = SYSTEM_TAGS,
  customTags = [],
}: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [groupedTags, setGroupedTags] = useState<Record<string, Tag[]>>({});

  useEffect(() => {
    const allTags = [...systemTags, ...customTags];
    const filtered = search
      ? allTags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      : allTags;

    const grouped: Record<string, Tag[]> = {};
    filtered.forEach(tag => {
      if (!grouped[tag.group]) grouped[tag.group] = [];
      grouped[tag.group].push(tag);
    });
    setGroupedTags(grouped);
  }, [search, systemTags, customTags]);

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

          <ScrollView style={styles.tagList}>
            {Object.entries(groupedTags).map(([group, tags]) => (
              <View key={group} style={styles.group}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
                  {group}
                </Text>
                <View style={styles.tagRow}>
                  {tags.map(tag => {
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
                        <Text
                          style={[
                            styles.tagText,
                            { color: isSelected ? '#fff' : colors.text },
                          ]}
                        >
                          {tag.name}
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
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
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
});
