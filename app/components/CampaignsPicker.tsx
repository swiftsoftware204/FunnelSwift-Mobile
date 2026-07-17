import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface Campaign {
  id: string;
  name: string;
  slug: string;
  campaign_type?: string;
  type?: string;
  status?: string;
}

interface CampaignsPickerProps {
  visible: boolean;
  onClose: () => void;
}

const CAMPAIGN_ICONS: Record<string, string> = {
  spin_wheel: '🎡',
  raffle: '🎲',
  quiz: '📝',
  trivia: '🧠',
  social_contest: '📱',
  referral: '👥',
  checkin: '📍',
  points: '⭐',
  purchase: '🛒',
  photo_contest: '📸',
  form: '📋',
  custom: '🔧',
};

export default function CampaignsPicker({ visible, onClose }: CampaignsPickerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      loadCampaigns();
    }
  }, [visible]);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const data = await http.getCampaigns();
      const list = data?.campaigns || [];
      setCampaigns(list.filter((c: Campaign) => c.status !== 'archived'));
    } catch (err: any) {
      Alert.alert('Error', 'Could not load campaigns.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCampaign(campaign: Campaign) {
    const url = `https://app.incentiveswift.com/c/${campaign.slug}`;
    Linking.openURL(url).catch(() => {
      // Fallback to share if browser won't open
      handleShare(campaign);
    });
  }

  async function handleShare(campaign: Campaign) {
    const url = `https://app.incentiveswift.com/c/${campaign.slug}`;
    try {
      await Share.share({
        message: `Check this out: ${campaign.name}\n${url}`,
        url: url,
        title: campaign.name,
      });
    } catch {
      // User cancelled share
    }
  }

  const icon = (type?: string) => CAMPAIGN_ICONS[type || ''] || '📢';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Share a Campaign</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Tap a campaign name to open it, or tap the share icon
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : campaigns.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No campaigns found.</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Go to FunnelSwift web → Settings → Connect Apps to link your IncentiveSwift account.
              </Text>
            </View>
          ) : (
            <FlatList
              data={campaigns}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.campaignRow, { borderColor: colors.border }]}>
                  <Text style={styles.campaignIcon}>{icon(item.campaign_type || item.type)}</Text>
                  <TouchableOpacity
                    style={styles.campaignText}
                    onPress={() => handleOpenCampaign(item)}
                    onLongPress={() => handleShare(item)}
                    delayLongPress={300}
                  >
                    <Text style={[styles.campaignName, { color: colors.primary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.campaignMeta, { color: colors.textMuted }]}>
                      {(item.campaign_type || item.type || 'campaign').replace('_', ' ')}
                      {item.status ? ` · ${item.status}` : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => handleShare(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="share-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginBottom: 16 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyHint: { fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  list: { maxHeight: 400 },
  campaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  campaignIcon: { fontSize: 22, marginRight: 12 },
  campaignText: { flex: 1, paddingRight: 8 },
  campaignName: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  campaignMeta: { fontSize: 12, marginTop: 2 },
  shareButton: {
    padding: 8,
    marginLeft: 4,
  },
});