import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';

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

interface Props {
  onScanComplete: (data: ScannedCardData) => void;
  onClose: () => void;
}

export default function BusinessCardScanner({ onScanComplete, onClose }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const { colors } = useTheme();

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  async function takePicture() {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.8,
      });
      if (photo?.uri) {
        setImageUri(photo.uri);
        await processImage(photo.uri);
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
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      await processImage(result.assets[0].uri);
    }
  }

  async function processImage(uri: string) {
    setProcessing(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'business_card.jpg';
      const fileType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      formData.append('image', {
        uri,
        name: filename,
        type: fileType,
      } as any);

      const { data, error } = await supabase.functions.invoke('ocr-parse-card', {
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (error) {
        // Fallback: call web OCR endpoint directly
        const response = await fetch(
          'https://wtlbpeoabwneitawrrtz.supabase.co/functions/v1/ocr-parse-card',
          {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: `Bearer ${supabase.supabaseKey}`,
            },
          }
        );
        const result = await response.json();
        if (result.error) {
          Alert.alert('OCR Error', result.error);
        } else {
          onScanComplete(result as ScannedCardData);
        }
      } else {
        onScanComplete(data as ScannedCardData);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to process business card');
    }
    setProcessing(false);
  }

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-off" size={64} color={colors.textMuted} />
        <Text style={[styles.permissionText, { color: colors.text }]}>
          Camera permission is required to scan business cards
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
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

  if (imageUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image source={{ uri: imageUri }} style={styles.preview} />
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.surface }]}
            onPress={() => setImageUri(null)}
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
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.back}
        ratio="4:3"
      >
        <View style={styles.cameraOverlay}>
          {/* Scanner frame guide */}
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
      </Camera>

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
    justifyContent: 'center',
    alignItems: 'center',
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
    height: FRAME_SIZE * 0.63, // Business card aspect ratio ~1.586:1
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
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
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
