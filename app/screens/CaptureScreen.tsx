import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { supabase, LeadInsert } from '../../lib/supabase';
import BusinessCardScanner, { ScannedCardData } from '../components/BusinessCardScanner';
import TagSelector from '../components/TagSelector';
import NFCEventCapture from '../components/NFCEventCapture';

const INDUSTRIES = [
  'Restaurant', 'Retail', 'Healthcare', 'Real Estate', 
  'Automotive', 'Professional Services', 'Home Services', 'Other'
];

const SOURCES = [
  'Walk-in', 'Referral', 'Cold Call', 'Event', 'Social Media', 'Other'
];

export default function CaptureScreen() {
  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNFC, setShowNFC] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
      
      // Load available tags from dynamic tenant_tags system
      const { data: tagsData } = await supabase
        .from('vw_tenant_tags_with_groups')
        .select('id, tag_name, display_name, color, icon, group_name, group_color')
        .eq('is_active', true);
      if (tagsData && tagsData.length > 0) {
        const mapped = tagsData.map((t: any) => ({
          id: t.id,
          name: t.tag_name,
          displayName: t.display_name,
          color: t.color ? `#${t.color.replace('#', '')}` : '#5B4FFF',
          icon: t.icon || '',
          group: t.group_name || 'Custom',
          groupId: t.group_name || 'custom',
          is_system: true,
        }));
        setAvailableTags(mapped);
      } else {
        // Fallback: load from tenant_tags directly
        const { data: fallbackTags } = await supabase
          .from('tenant_tags')
          .select('id, tag_name, display_name, color, icon, group_id')
          .eq('is_active', true)
          .order('display_name');
        if (fallbackTags) {
          const mapped = fallbackTags.map((t: any) => ({
            id: t.id,
            name: t.tag_name,
            displayName: t.display_name,
            color: t.color ? `#${t.color.replace('#', '')}` : '#5B4FFF',
            icon: t.icon || '',
            group: 'Tags',
            groupId: t.group_id || 'default',
            is_system: true,
          }));
          setAvailableTags(mapped);
        }
      }
    })();
  }, []);

  async function handleScanComplete(data: ScannedCardData, tags: any[]) {
    setShowScanner(false);
    
    // Check if contact already exists by email or phone
    if (data.email || data.phone) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .or(`email.eq.${data.email},phone.eq.${data.phone}`)
        .single();

      if (existingContact) {
        // Contact exists - just add new tags and fire automations
        await addTagsToContact(existingContact.id, tags);
        Alert.alert(
          'Contact Updated',
          `Existing contact found. ${tags.length} new tag(s) applied and automations fired.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // New contact - fill form with scanned data
    if (data.business_name) setBusinessName(data.business_name);
    if (data.first_name) setFirstName(data.first_name);
    if (data.last_name) setLastName(data.last_name);
    if (data.email) setEmail(data.email);
    if (data.phone) setPhone(data.phone);
    if (data.website) setWebsite(data.website);
    
    // Store tags to apply after save
    if (tags.length > 0) {
      setSelectedTags(tags.map(t => t.name));
    }
    
    Alert.alert('Card Scanned', 'Business card information extracted. Review and save to fire automations.');
  }

  async function addTagsToContact(contactId: string, tags: any[]) {
    // Batch insert tags using tag_name for compatibility with both systems
    const tagInserts = tags.map(tag => ({
      contact_id: contactId,
      tag_name: tag.name,
    }));
    
    if (tagInserts.length > 0) {
      await supabase.from('contact_tags').insert(tagInserts);
    }

    // Fire webhook for first tag (avoid redundant calls)
    if (tags.length > 0) {
      await supabase.functions.invoke('tag-trigger-webhook', {
        body: {
          contact_id: contactId,
          tag_name: tags[0].name,
          tag_count: tags.length,
        },
      }).catch(() => {});
    }
  }

  function handleToggleTag(tagName: string) {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  }

  async function handleSubmit() {
    if (!businessName && !firstName && !phone) {
      Alert.alert('Error', 'Please enter at least a business name, contact name, or phone number');
      return;
    }

    setSubmitting(true);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();

    const tenantId = profile?.tenant_id || await getDefaultTenant();

    const lead: LeadInsert = {
      tenant_id: tenantId,
      first_name: firstName || null,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
      business_name: businessName || null,
      website: website || null,
      industry: industry || null,
      lead_score: calculateLeadScore(),
      status: 'new',
      source: source,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert([lead])
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Save tags if any were selected
      if (selectedTags.length > 0 && data) {
        const tagInserts = selectedTags.map(tagName => ({
          contact_id: data.id,
          tag_name: tagName,
        }));
        await supabase.from('contact_tags').insert(tagInserts).maybeSingle();
      }

      Alert.alert(
        'Success!',
        'Lead captured successfully.',
        [{ text: 'OK', onPress: clearForm }]
      );
    }
  }

  async function getDefaultTenant(): Promise<string> {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();
    return data?.id || '';
  }

  function calculateLeadScore(): number {
    let score = 50;
    if (email) score += 10;
    if (phone) score += 10;
    if (website) score += 10;
    if (industry) score += 10;
    if (notes.length > 50) score += 10;
    return Math.min(score, 100);
  }

  function clearForm() {
    setBusinessName('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setIndustry('');
    setSource('Walk-in');
    setNotes('');
    setSelectedTags([]);
  }

  if (showScanner) {
    return (
      <BusinessCardScanner
        onScanComplete={handleScanComplete}
        onClose={() => setShowScanner(false)}
        availableTags={availableTags}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Capture Lead
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowScanner(true)}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.scanButtonText}>Scan Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.warning || '#F59E0B', marginLeft: 8 }]}
              onPress={() => setShowNFC(true)}
            >
              <Ionicons name="wifi" size={20} color="#fff" />
              <Text style={styles.scanButtonText}>NFC Event</Text>
            </TouchableOpacity>
            {location && (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={14} color={colors.success} />
                <Text style={[styles.locationText, { color: colors.success }]}>
                  GPS
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Business Info
          </Text>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Business Name *"
            placeholderTextColor={colors.textMuted}
            value={businessName}
            onChangeText={setBusinessName}
          />

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Website (optional)"
            placeholderTextColor={colors.textMuted}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
          />

          <View style={styles.industryContainer}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Industry</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {INDUSTRIES.map((ind) => (
                <TouchableOpacity
                  key={ind}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: industry === ind ? colors.primary : colors.surfaceLight,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setIndustry(ind)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: industry === ind ? '#fff' : colors.text },
                  ]}>
                    {ind}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contact Person
          </Text>
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput, { 
                backgroundColor: colors.surfaceLight,
                borderColor: colors.border,
                color: colors.text,
              }]}
              placeholder="First Name"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, styles.halfInput, { 
                backgroundColor: colors.surfaceLight,
                borderColor: colors.border,
                color: colors.text,
              }]}
              placeholder="Last Name"
              placeholderTextColor={colors.textMuted}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Phone Number *"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Email Address"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Lead Details
          </Text>
          
          <View style={styles.sourceContainer}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SOURCES.map((src) => (
                <TouchableOpacity
                  key={src}
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: source === src ? colors.primary : colors.surfaceLight,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSource(src)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: source === src ? '#fff' : colors.text },
                  ]}>
                    {src}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tags Section */}
          <TouchableOpacity
            style={[styles.tagSelector, { borderColor: colors.border }]}
            onPress={() => setShowTagSelector(true)}
          >
            <Ionicons name="pricetags" size={20} color={colors.primary} />
            {selectedTags.length > 0 ? (
              <View style={styles.selectedTagsRow}>
                {selectedTags.map(tag => (
                  <View key={tag} style={[styles.miniTag, { backgroundColor: colors.primary + '30' }]}>
                    <Text style={[styles.miniTagText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.tagPlaceholder, { color: colors.textMuted }]}>
                Add tags...
              </Text>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textArea, { 
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Notes (what did you discuss?)"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.submitButtonText}>Capture Lead</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <TagSelector
        visible={showTagSelector}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClose={() => setShowTagSelector(false)}
        availableTags={availableTags}
      />
      
      {showNFC && (
        <NFCEventCapture
          eventName="Networking Event"
          availableTags={availableTags}
          onCapture={(contact, tags) => {
            // Handle NFC capture
            console.log('NFC Contact:', contact, 'Tags:', tags);
          }}
          onClose={() => setShowNFC(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    minHeight: 100,
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  industryContainer: {
    marginTop: 8,
  },
  sourceContainer: {
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
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
  tagPlaceholder: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 32,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
