import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';

export interface ScannedCardData {
  business_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  title?: string;
}

interface Tag {
  id: string;
  name: string;
  displayName?: string;
  color?: string;
  icon?: string;
  group?: string;
  is_system: boolean;
}

interface Props {
  onScanComplete: (data: ScannedCardData, tags: Tag[]) => void;
  onClose: () => void;
  availableTags: Tag[];
}

export default function BusinessCardScanner({ onScanComplete, onClose, availableTags }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedCardData | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { colors } = useTheme();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  async function takePicture() {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });
      if (photo?.base64) {
        setImageUri(photo.uri);
        await processImage(photo.base64);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture image');
    }
    setScanning(false);
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setImageUri(result.assets[0].uri);
      await processImage(result.assets[0].base64);
    }
  }

  async function processImage(base64: string) {
    setProcessing(true);
    try {
      // Try backend OCR first
      const response = await fetch('https://funnelswift.com/api/ocr/parse-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.extracted) {
          const data: ScannedCardData = {
            business_name: result.extracted.businessName || '',
            first_name: result.extracted.firstName || '',
            last_name: result.extracted.lastName || '',
            email: result.extracted.email || '',
            phone: result.extracted.phone || '',
            website: result.extracted.website || '',
            title: result.extracted.title || '',
          };
          setScannedData(data);
          setShowTagSelector(true);
          return;
        }
      }

      // Fallback: use Google Cloud Vision API directly
      const visionKey = ''; // Set via environment or config
      if (visionKey) {
        const visionResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: base64 },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
              }],
            }),
          }
        );

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const text = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
          const data = parseCardText(text);
          setScannedData(data);
          setShowTagSelector(true);
          return;
        }
      }

      throw new Error('OCR service unavailable');
    } catch (err: any) {
      // Last resort: let user fill manually
      Alert.alert(
        'Scan Failed',
        'Could not read the business card. You can fill in the details manually.',
        [{ text: 'OK', onPress: () => {
          onScanComplete({ first_name: 'Scanned' }, []);
          onClose();
        }}]
      );
    }
    setProcessing(false);
  }

  function parseCardText(text: string): ScannedCardData {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const data: ScannedCardData = {};

    for (const line of lines) {
      // Email detection
      if (/[\w.-]+@[\w.-]+\.\w+/.test(line)) {
        data.email = line;
      }
      // Phone detection
      else if (/\+?\d[\d\s\-().]{7,}\d/.test(line)) {
        data.phone = line;
      }
      // URL detection
      else if (/^(https?:\/\/)?[\w.-]+\.\w{2,}(\/\S*)?$/.test(line)) {
        data.website = line;
      }
    }

    // First line is likely the name
    if (lines.length > 0 && !data.email && !data.website) {
      const nameParts = lines[0].split(' ');
      if (nameParts.length >= 2) {
        data.first_name = nameParts[0];
        data.last_name = nameParts.slice(1).join(' ');
      } else {
        data.first_name = lines[0];
      }
    }

    // Company is often the second line
    if (lines.length > 1 && !lines[1].includes('@') && !lines[1].includes('.com') && !lines[1].match(/\d/)) {
      data.business_name = lines[1];
    }

    // Look for title (often after company)
    for (let i = 2; i < Math.min(lines.length, 5); i++) {
      const keywords = ['manager', 'director', 'president', 'ceo', 'cto', 'founder', 'engineer', 'developer', 'lead', 'head of', 'vp', 'vice president', 'owner'];
      if (keywords.some(k => lines[i].toLowerCase().includes(k))) {
        data.title = lines[i];
        break;
      }
    }

    return data;
  }

  const toggleTag = (tag: Tag) => {
    const exists = selectedTags.find(t => t.id === tag.id);
    if (exists) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    if (scannedData) {
      onScanComplete(scannedData, selectedTags);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.permissionText, { color: colors.text }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (processing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.processingText, { color: colors.text }]}>
          Processing business card...
        </Text>
        <Text style={[styles.processingSubtext, { color: colors.textMuted }]}>
          Extracting contact information
        </Text>
      </View>
    );
  }

  // Tag Selector Screen
  if (showTagSelector && scannedData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Select Tags
          </Text>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={selectedTags.length === 0}
          >
            <Text style={[
              styles.saveText, 
              { color: selectedTags.length > 0 ? colors.primary : colors.textMuted }
            ]}>
              Save ({selectedTags.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scannedInfo}>
          <Text style={[styles.scannedName, { color: colors.text }]}>
            {scannedData.first_name} {scannedData.last_name}
          </Text>
          <Text style={[styles.scannedCompany, { color: colors.textMuted }]}>
            {scannedData.business_name}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          Select tags to apply:
        </Text>

        <ScrollView style={styles.tagList}>
          {availableTags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagItem,
                {
                  backgroundColor: selectedTags.find(t => t.id === tag.id)
                    ? colors.primary
                    : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text
                style={{
                  color: selectedTags.find(t => t.id === tag.id)
                    ? '#fff'
                    : colors.text,
                  fontWeight: '500',
                }}
              >
                {tag.name}
              </Text>
              {tag.is_system && (
                <Ionicons
                  name="flash"
                  size={12}
                  color={selectedTags.find(t => t.id === tag.id) ? '#fff' : colors.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Tags will fire automations when contact is saved
        </Text>
      </View>
    );
  }

  if (imageUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image source={{ uri: imageUri }} style={styles.preview} />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.surface }]}
            onPress={() => {
              setImageUri(null);
              setScannedData(null);
            }}
          >
            <Ionicons name="refresh" size={24} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.error }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#fff" />
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.scannerFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <Text style={styles.scannerHint}>
            Align business card within the frame
          </Text>
        </View>
      </CameraView>

      <View style={[styles.controls, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={pickFromGallery}
        >
          <Ionicons name="images" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: colors.primary }]}
          onPress={takePicture}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surface }]}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME_SIZE = 280;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scannedInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  scannedName: {
    fontSize: 20,
    fontWeight: '600',
  },
  scannedCompany: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tagList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    padding: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scannerFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * 0.63,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#5B4FFF',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#5B4FFF',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#5B4FFF',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#5B4FFF',
  },
  scannerHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: '70%',
    resizeMode: 'contain',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
