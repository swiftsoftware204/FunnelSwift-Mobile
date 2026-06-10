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
  
  const { user } = useAuth();
  const { colors, spacing } = useTheme();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    })();
  }, []);

  async function handleSubmit() {
    if (!businessName && !firstName && !phone) {
      Alert.alert('Error', 'Please enter at least a business name, contact name, or phone number');
      return;
    }

    setSubmitting(true);

    // Get user's tenant_id from their profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();

    // If no tenant assigned, use a default or prompt user
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
      Alert.alert(
        'Success!',
        'Lead captured successfully.',
        [{ text: 'OK', onPress: clearForm }]
      );
    }
  }

  async function getDefaultTenant(): Promise<string> {
    // Get first available tenant or create logic
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();
    
    return data?.id || '';
  }

  function calculateLeadScore(): number {
    let score = 50; // Base score
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
          {location && (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={14} color={colors.success} />
              <Text style={[styles.locationText, { color: colors.success }]}>
                Location captured
              </Text>
            </View>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
