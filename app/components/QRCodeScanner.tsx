import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';

export interface QRScannedData {
  raw: string;
  type: 'url' | 'email' | 'phone' | 'text' | 'vcard';
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  url?: string;
  title?: string;
}

interface Props {
  onScanComplete: (data: QRScannedData) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScanComplete, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  function parseQRContent(raw: string): QRScannedData {
    const trimmed = raw.trim();

    // vCard format (most common for contact QR codes)
    const vcardMatch = trimmed.match(/^BEGIN:VCARD/i);
    if (vcardMatch) {
      const result: QRScannedData = { raw: trimmed, type: 'vcard' };

      const fnMatch = trimmed.match(/^FN[;:](.+)$/im);
      if (fnMatch) result.name = fnMatch[1].trim();

      const emailMatch = trimmed.match(/^EMAIL[;:](\S+@\S+\.\S+)/im);
      if (emailMatch) result.email = emailMatch[1].trim();

      const telMatch = trimmed.match(/^TEL[;:]?(.*)$/im);
      if (telMatch) {
        const phone = telMatch[1].replace(/[\s\-\(\)]/g, '').trim();
        if (phone) result.phone = phone;
      }

      const orgMatch = trimmed.match(/^ORG[;:](.+)$/im);
      if (orgMatch) result.company = orgMatch[1].trim();

      const titleMatch = trimmed.match(/^TITLE[;:](.+)$/im);
      if (titleMatch) result.title = titleMatch[1].trim();

      const urlMatch = trimmed.match(/^URL[;:](.+)$/im);
      if (urlMatch) result.url = urlMatch[1].trim();

      return result;
    }

    // mailto: link
    const mailtoMatch = trimmed.match(/^mailto:(\S+@\S+\.\S+)/i);
    if (mailtoMatch) {
      return { raw: trimmed, type: 'email', email: mailtoMatch[1] };
    }

    // tel: link
    const telMatch = trimmed.match(/^tel:(\+?\d+)/i);
    if (telMatch) {
      return { raw: trimmed, type: 'phone', phone: telMatch[1] };
    }

    // Plain URL
    const urlMatch = trimmed.match(/^(https?:\/\/)?[\w.-]+\.\w{2,}(\/\S*)?$/i);
    if (urlMatch) {
      const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      return { raw: trimmed, type: 'url', url };
    }

    // Plain email
    const plainEmail = trimmed.match(/^(\S+@\S+\.\S+)$/);
    if (plainEmail) {
      return { raw: trimmed, type: 'email', email: plainEmail[1] };
    }

    // Plain phone number
    const plainPhone = trimmed.match(/^\+?\d{7,15}$/);
    if (plainPhone) {
      return { raw: trimmed, type: 'phone', phone: plainPhone[0] };
    }

    // Fallback: plain text
    return { raw: trimmed, type: 'text', name: trimmed };
  }

  function validateAndComplete(data: QRScannedData): string | null {
    if (data.type === 'url' && data.url) {
      return 'This QR code contains only a website URL. No contact information was found. Try the business card scanner instead.';
    }

    if (data.type === 'text' && !data.name) {
      return 'This QR code does not contain recognizable contact information. Please capture this lead manually.';
    }

    if (data.type === 'vcard' || data.email || data.phone) {
      return null; // Valid
    }

    return 'Could not extract contact information from this QR code.';
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (!scanning) return;

    setScanning(false);
    Vibration.vibrate(100);

    const parsed = parseQRContent(data);
    const error = validateAndComplete(parsed);

    if (error) {
      Alert.alert(
        'No Contact Found',
        error,
        [
          { text: 'Scan Again', onPress: () => setScanning(true) },
          { text: 'Cancel', style: 'cancel', onPress: onClose },
        ]
      );
      return;
    }

    // Valid — send back
    onScanComplete(parsed);
  }

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

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.frameContainer}>
            <View style={styles.qrFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Ionicons name="qr-code" size={48} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.hint}>Point camera at a QR code</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Works with vCard contact QR codes, mailto:, tel:, and URLs
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    marginVertical: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  frameContainer: {
    alignItems: 'center',
  },
  qrFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#5B4FFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  hint: {
    color: '#fff',
    fontSize: 15,
    marginTop: 20,
    opacity: 0.8,
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
});
