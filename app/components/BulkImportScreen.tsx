import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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
  const { colors } = useTheme();

  async function importFromContacts() {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Contact access is needed to import contacts.');
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.Emails,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Company,
        ],
      });

      const parsed: ImportLead[] = data
        .filter((c: any) => c.name && (c.emails?.length || c.phoneNumbers?.length))
        .map(c => ({
          name: c.name || '',
          email: c.emails?.[0]?.email || '',
          phone: c.phoneNumbers?.[0]?.number || '',
          company: c.company || '',
          tags: ['Imported'],
          status: 'pending' as const,
        }));

      if (parsed.length === 0) {
        Alert.alert('No Contacts', 'No contacts with email or phone found on this device.');
      } else {
        setLeads(parsed);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to read contacts');
    } finally {
      setLoading(false);
    }
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
      const content = await FileSystem.readAsStringAsync(fileUri);
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

      {/* No leads loaded — show import sources */}
      {leads.length === 0 && (
        <View style={styles.sourceList}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Import from</Text>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: colors.surface }]}
            onPress={importFromContacts}
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
