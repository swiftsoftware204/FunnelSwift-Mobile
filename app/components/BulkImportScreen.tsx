import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Contacts from 'expo-contacts/legacy';
import * as DocumentPicker from 'expo-document-picker';

import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface ImportLead {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string[];
  status: 'pending' | 'importing' | 'done' | 'error';
  error?: string;
}

interface Props {
  onClose: () => void;
  onComplete: (count: number) => void;
}

export default function BulkImportScreen({ onClose, onComplete }: Props) {
  const [leads, setLeads] = useState<ImportLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSelection, setContactSelection] = useState<any[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [contactGroups, setContactGroups] = useState<{id: string; name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();

  async function importFromGroups() {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Contact access is needed to import contacts.');
        setLoading(false);
        return;
      }

      // iOS supports contact groups; Android does not — skip group picker
      if (Platform.OS === 'ios') {
        try {
          const groups = await Contacts.getGroupsAsync({});
          if (groups && groups.length > 0) {
            setContactGroups([
              { id: '__all__', name: 'All Contacts' },
              ...groups.map((g: any) => ({ id: g.id, name: g.name || 'Unnamed Group' })),
            ]);
            setShowGroupPicker(true);
            return;
          }
        } catch {
          // getGroupsAsync failed — fall through to load all
        }
      }

      // Android or no groups: load all contacts directly
      await loadAllContacts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read contacts.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFromGroup(groupId: string, groupName?: string) {
    setShowGroupPicker(false);
    setLoading(true);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.Emails,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Company,
        ],
        ...(groupId !== '__all__' ? { groupId } : {}),
      });

      const allContacts = data
        .filter((c: any) => c.name && (c.emails?.length || c.phoneNumbers?.length))
        .map(c => ({
          name: c.name || '',
          email: c.emails?.[0]?.email || '',
          phone: c.phoneNumbers?.[0]?.number || '',
          company: c.company || '',
          tags: ['Imported'],
          status: 'pending' as const,
          _selected: false,
        }));

      if (allContacts.length === 0) {
        Alert.alert('No Contacts', groupName
          ? `No contacts with email or phone found in "${groupName}".`
          : 'No contacts with email or phone found.');
        return;
      }

      setContactSelection(allContacts);
      setShowContactPicker(true);
    } catch (err: any) {
      // Fallback: load all contacts
      await loadAllContacts();
    } finally {
      setLoading(false);
    }
  }

  async function loadAllContacts() {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.Emails,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Company,
        ],
      });

      const allContacts = data
        .filter((c: any) => c.name && (c.emails?.length || c.phoneNumbers?.length))
        .map(c => ({
          name: c.name || '',
          email: c.emails?.[0]?.email || '',
          phone: c.phoneNumbers?.[0]?.number || '',
          company: c.company || '',
          tags: ['Imported'],
          status: 'pending' as const,
          _selected: false,
        }));

      if (allContacts.length === 0) {
        Alert.alert('No Contacts', 'No contacts with email or phone found on this device.');
        return;
      }

      setContactSelection(allContacts);
      setShowContactPicker(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read contacts');
    }
  }

  async function searchContacts(searchText: string) {
    setSearchQuery(searchText);
    if (!searchText.trim()) {
      // Reset to full list
      setContactSelection(prev => prev.map(c => ({ ...c, _visible: true })));
      return;
    }
    const q = searchText.toLowerCase();
    setContactSelection(prev => prev.map(c => ({
      ...c,
      _visible: c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.phone.toLowerCase().includes(q),
    })));
  }

  async function importFromCSV() {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }

      const fileUri = result.assets[0].uri;
      const response = await fetch(fileUri);
      const content = await response.text();
      const lines = content.split('\n').filter(l => l.trim());

      if (lines.length < 2) {
        Alert.alert('Empty File', 'CSV file has no data rows.');
        setLoading(false);
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => ['name', 'full name', 'first name', 'contact'].includes(h));
      const emailIdx = headers.findIndex(h => ['email', 'e-mail', 'email address'].includes(h));
      const phoneIdx = headers.findIndex(h => ['phone', 'telephone', 'tel', 'phone number', 'mobile'].includes(h));
      const companyIdx = headers.findIndex(h => ['company', 'organization', 'org', 'business'].includes(h));

      const parsed: ImportLead[] = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          name: nameIdx >= 0 ? cols[nameIdx] || '' : '',
          email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
          phone: phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
          company: companyIdx >= 0 ? cols[companyIdx] || '' : '',
          tags: ['Imported'],
          status: 'pending' as const,
        };
      }).filter(l => l.name || l.email || l.phone);

      if (parsed.length === 0) {
        Alert.alert('No Data', 'Could not parse any contacts from the CSV. Make sure it has name, email, or phone columns.');
      } else {
        setLeads(parsed);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read file');
    } finally {
      setLoading(false);
    }
  }

  async function startImport() {
    setImporting(true);
    setImported(0);

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      // Skip empty rows
      if (!lead.name && !lead.email && !lead.phone) {
        setLeads(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error', error: 'No data' };
          return updated;
        });
        continue;
      }

      setLeads(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'importing' };
        return updated;
      });

      try {
        const payload: Record<string, any> = {};
        if (lead.name) payload.name = lead.name;
        if (lead.email) payload.email = lead.email;
        if (lead.phone) payload.phone = lead.phone;
        if (lead.company) payload.company = lead.company;
        payload.tags = lead.tags;
        payload.source = 'Bulk Import';

        await http.createLead(payload);

        setLeads(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'done' };
          return updated;
        });
        setImported(prev => prev + 1);
      } catch (err: any) {
        setLeads(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error', error: err.message };
          return updated;
        });
      }
    }

    setImporting(false);
    onComplete(imported);
    Alert.alert('Import Complete', `Successfully imported ${imported} of ${leads.length} contacts.`);
  }

  function removeLead(index: number) {
    setLeads(prev => prev.filter((_, i) => i !== index));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Bulk Import</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Group Picker */}
      {showGroupPicker && (
        <View style={styles.contactPickerOverlay}>
          <View style={[styles.contactPickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.contactPickerHeader}>
              <Text style={[styles.contactPickerTitle, { color: colors.text }]}>Select Contact Group</Text>
              <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={contactGroups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  onPress={() => loadFromGroup(item.id, item.name)}
                >
                  <View style={[styles.groupIconBox, { backgroundColor: item.id === '__all__' ? colors.primary : colors.warning }]}>
                    <Ionicons
                      name={item.id === '__all__' ? 'people' : 'folder'}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.contactRowInfo}>
                    <Text style={[styles.contactRowName, { color: colors.text }]}>{item.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              style={styles.contactPickerList}
            />
          </View>
        </View>
      )}

      {/* Contact Picker Modal */}
      {showContactPicker && (
        <View style={styles.contactPickerOverlay}>
          <View style={[styles.contactPickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.contactPickerHeader}>
              <Text style={[styles.contactPickerTitle, { color: colors.text }]}>
                Select Contacts ({contactSelection.filter(c => c._selected).length} selected)
              </Text>
              <TouchableOpacity onPress={() => {
                setShowContactPicker(false);
                setSearchQuery('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.contactPickerActions}>
              <TouchableOpacity onPress={() => {
                setContactSelection(prev => prev.map(c => ({ ...c, _selected: true })));
              }}>
                <Text style={[styles.contactPickerAction, { color: colors.primary }]}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setContactSelection(prev => prev.map(c => ({ ...c, _selected: false })));
              }}>
                <Text style={[styles.contactPickerAction, { color: colors.textMuted }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const selected = contactSelection.filter(c => c._selected);
                if (selected.length === 0) {
                  Alert.alert('No Selection', 'Select at least one contact to import.');
                  return;
                }
                setLeads(selected.map(({ _selected, ...rest }) => ({ ...rest, status: 'pending' as const })));
                setShowContactPicker(false);
              }}>
                <Text style={[styles.contactPickerAction, { color: colors.success, fontWeight: '700' }]}>
                  Import ({contactSelection.filter(c => c._selected).length})
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
              marginHorizontal: 20,
              marginBottom: 8,
              height: 40,
              borderRadius: 8,
              paddingHorizontal: 14,
              fontSize: 14,
            }]}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={searchContacts}
          />
          <FlatList
              data={contactSelection.filter((c: any) => c._visible == null || c._visible !== false)}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[styles.contactRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setContactSelection(prev => {
                      const updated = [...prev];
                      updated[index] = { ...updated[index], _selected: !updated[index]._selected };
                      return updated;
                    });
                  }}
                >
                  <Ionicons
                    name={item._selected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item._selected ? colors.primary : colors.textMuted}
                  />
                  <View style={styles.contactRowInfo}>
                    <Text style={[styles.contactRowName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.contactRowDetail, { color: colors.textMuted }]}>
                      {item.email || item.phone || 'No contact info'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.contactPickerList}
            />
          </View>
        </View>
      )}

      {/* No leads loaded — show import sources */}
      {leads.length === 0 && (
        <View style={styles.sourceList}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Import from</Text>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: colors.surface }]}
            onPress={importFromGroups}
            disabled={loading}
          >
            <View style={[styles.sourceIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceName, { color: colors.text }]}>Phone Contacts</Text>
              <Text style={[styles.sourceDesc, { color: colors.textMuted }]}>
                Import contacts from your device address book
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: colors.surface }]}
            onPress={importFromCSV}
            disabled={loading}
          >
            <View style={[styles.sourceIcon, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="document-text" size={24} color={colors.warning} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={[styles.sourceName, { color: colors.text }]}>CSV File</Text>
              <Text style={[styles.sourceDesc, { color: colors.textMuted }]}>
                Upload a .csv file with name, email, phone columns
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Reading contacts...
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Leads loaded — show list */}
      {leads.length > 0 && (
        <>
          <View style={styles.statsBar}>
            <Text style={[styles.statsText, { color: colors.textMuted }]}>
              {leads.length} contacts found
            </Text>
            <Text style={[styles.statsText, { color: colors.success }]}>
              {imported} imported
            </Text>
          </View>

          <FlatList
            data={leads}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <View style={[styles.leadRow, { backgroundColor: colors.surface }]}>
                <View style={styles.leadInfo}>
                  <Text style={[styles.leadName, { color: colors.text }]} numberOfLines={1}>
                    {item.name || 'Unknown'}
                  </Text>
                  {item.email ? (
                    <Text style={[styles.leadDetail, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                  ) : null}
                  {item.phone ? (
                    <Text style={[styles.leadDetail, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.phone}
                    </Text>
                  ) : null}
                </View>
                <View>
                  {item.status === 'done' ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  ) : item.status === 'error' ? (
                    <Ionicons name="alert-circle" size={22} color={colors.error} />
                  ) : item.status === 'importing' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <TouchableOpacity onPress={() => removeLead(index)}>
                      <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            style={styles.list}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: colors.primary }]}
              onPress={startImport}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.importBtnText}>
                    Import {leads.length} Contacts
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Contact Picker
  contactPickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  contactPickerContainer: {
    flex: 1,
    marginTop: 80,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  contactPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contactPickerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  contactPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  contactPickerAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: { height: 40, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  contactPickerList: {
    flex: 1,
  },
  groupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  contactRowInfo: { flex: 1 },
  contactRowName: { fontSize: 15, fontWeight: '500' },
  contactRowDetail: { fontSize: 12, marginTop: 2 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700' },
  sourceList: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: 16, fontWeight: '600' },
  sourceDesc: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  loadingRow: { alignItems: 'center', marginTop: 32, gap: 12 },
  loadingText: { fontSize: 14 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsText: { fontSize: 13, fontWeight: '500' },
  list: { flex: 1, paddingHorizontal: 16 },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 14, fontWeight: '600' },
  leadDetail: { fontSize: 12, marginTop: 2 },
  footer: { padding: 20 },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
