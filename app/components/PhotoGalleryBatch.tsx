import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface BatchItem {
  uri: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: Record<string, string>;
  error?: string;
}

interface Props {
  onClose: () => void;
}

export default function PhotoGalleryBatch({ onClose }: Props) {
  const [images, setImages] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const { colors } = useTheme();

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is needed to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) return;

    const newItems: BatchItem[] = result.assets.map(a => ({
      uri: a.uri,
      status: 'pending' as const,
    }));

    setImages(prev => [...prev, ...newItems]);
  }

  async function processAll() {
    setProcessing(true);

    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      if (item.status === 'done' || item.status === 'processing') continue;

      setImages(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'processing' };
        return updated;
      });

      try {
        // Convert image to base64
        const response = await fetch(item.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const data = reader.result as string;
            resolve(data.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Send to backend OCR endpoint
        const ocrResult = await http.ocrParseCard(base64);

        // Create lead from parsed data
        const leadData: Record<string, any> = {};
        if (ocrResult.first_name) leadData.first_name = ocrResult.first_name;
        if (ocrResult.last_name) leadData.last_name = ocrResult.last_name;
        if (ocrResult.email) leadData.email = ocrResult.email;
        if (ocrResult.phone) leadData.phone = ocrResult.phone;
        if (ocrResult.business_name) leadData.company = ocrResult.business_name;
        if (ocrResult.website) leadData.website = ocrResult.website;
        if (ocrResult.title) leadData.title = ocrResult.title;
        if (ocrResult.address) leadData.address = ocrResult.address;
        leadData.source = 'Photo Gallery Batch';
        leadData.tags = ['Imported'];

        // Only create if we got at least a name or email
        if (leadData.first_name || leadData.email) {
          await http.createLead(leadData);
          setImages(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'done', result: leadData };
            return updated;
          });
        } else {
          setImages(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'error', error: 'No contact info found' };
            return updated;
          });
        }
      } catch (err: any) {
        setImages(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error', error: err.message };
          return updated;
        });
      }
    }

    setProcessing(false);
  }

  async function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  const doneCount = images.filter(i => i.status === 'done').length;
  const errorCount = images.filter(i => i.status === 'error').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Photo Batch</Text>
        <TouchableOpacity onPress={pickImages}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {images.length > 0 && (
        <View style={styles.statsBar}>
          <Text style={[styles.statsText, { color: colors.textMuted }]}>
            {images.length} images
          </Text>
          <Text style={[styles.statsText, { color: colors.success }]}>
            {doneCount} done
          </Text>
          {errorCount > 0 && (
            <Text style={[styles.statsText, { color: colors.error }]}>
              {errorCount} errors
            </Text>
          )}
        </View>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="images" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Photo Gallery Batch</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Select multiple business card photos from your gallery.{'\n'}
            Each card will be OCR'd and saved as a lead.
          </Text>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: colors.primary }]}
            onPress={pickImages}
          >
            <Ionicons name="images" size={20} color="#fff" />
            <Text style={styles.pickBtnText}>Select Photos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <FlatList
          data={images}
          keyExtractor={(_, i) => String(i)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <View style={styles.gridItem}>
              <Image source={{ uri: item.uri }} style={styles.thumb} />
              <View style={styles.overlayBadge}>
                {item.status === 'done' ? (
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                ) : item.status === 'error' ? (
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                ) : item.status === 'processing' ? (
                  <ActivityIndicator size="small" color="#5B4FFF" />
                ) : (
                  <TouchableOpacity onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Action buttons */}
      {images.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addMoreText, { color: colors.primary }]}>Add More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.processBtn,
              { backgroundColor: colors.primary, opacity: processing ? 0.6 : 1 },
            ]}
            onPress={processAll}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="scan" size={20} color="#fff" />
                <Text style={styles.processBtnText}>
                  Process {images.length - doneCount - errorCount} Remaining
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statsText: { fontSize: 13, fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  pickBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  grid: { padding: 8 },
  gridItem: { flex: 1, margin: 4, position: 'relative' },
  thumb: { width: '100%', aspectRatio: 0.7, borderRadius: 8 },
  overlayBadge: { position: 'absolute', top: 4, right: 4 },
  footer: { padding: 20, gap: 10 },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addMoreText: { fontSize: 14, fontWeight: '500' },
  processBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  processBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
