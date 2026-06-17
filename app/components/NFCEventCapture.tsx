import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
}

interface NFCEventCaptureProps {
  onCapture: (contact: Contact) => void;
  onClose: () => void;
  eventName: string;
}

export default function NFCEventCapture({
  onCapture,
  onClose,
  eventName,
}: NFCEventCaptureProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [lastContact, setLastContact] = useState<Contact | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pulseAnim = new Animated.Value(1);
  const { colors } = useTheme();

  useEffect(() => {
    if (isScanning) {
      startPulseAnimation();
    }
  }, [isScanning]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleNFCTap = () => {
    // Simulate NFC read
    const contact: Contact = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      company: 'Acme Corp',
      title: 'CEO',
    };
    
    Vibration.vibrate(200);
    setLastContact(contact);
    setCapturedCount(prev => prev + 1);
    setShowSuccess(true);
    onCapture(contact);
    
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={32} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.eventName, { color: colors.text }]}>
            {eventName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            NFC Event Mode
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.counterContainer}>
        <Text style={[styles.counterNumber, { color: colors.primary }]}>
          {capturedCount}
        </Text>
        <Text style={[styles.counterLabel, { color: colors.textMuted }]}>
          Contacts Captured
        </Text>
      </View>

      <View style={styles.scanArea}>
        {!isScanning ? (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsScanning(true)}
          >
            <Ionicons name="wifi" size={48} color="#fff" />
            <Text style={styles.startButtonText}>Start NFC Capture</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.scanningActive}>
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  backgroundColor: colors.primary,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <TouchableOpacity
              style={[styles.nfcIcon, { backgroundColor: colors.primary }]}
              onPress={handleNFCTap}
            >
              <Ionicons name="wifi" size={64} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.scanningText, { color: colors.text }]}>
              Tap to Simulate NFC
            </Text>
          </View>
        )}
      </View>

      {lastContact && (
        <View style={[styles.lastContact, { backgroundColor: colors.surface }]}>
          <Text style={[styles.lastContactLabel, { color: colors.textMuted }]}>
            Last Captured
          </Text>
          <Text style={[styles.lastContactName, { color: colors.text }]}>
            {lastContact.firstName} {lastContact.lastName}
          </Text>
        </View>
      )}

      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={[styles.successBox, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={64} color="#fff" />
            <Text style={styles.successText}>Contact Saved!</Text>
          </View>
        </View>
      )}

      {isScanning && (
        <TouchableOpacity
          style={[styles.stopButton, { borderColor: colors.error }]}
          onPress={() => setIsScanning(false)}
        >
          <Text style={[styles.stopButtonText, { color: colors.error }]}>
            Stop NFC Capture
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

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
  headerCenter: {
    alignItems: 'center',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  counterContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 16,
    marginTop: 8,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  scanningActive: {
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
  },
  nfcIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
  },
  lastContact: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  lastContactLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  lastContactName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  successText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
  },
  stopButton: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
