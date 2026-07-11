import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

export default function HomeScreen({ navigation }: any) {
  const { user, isSuperAdmin } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });

  useEffect(() => {
    (async () => {
      try {
        const data = await http.getDashboardStats();
        if (data) {
          setStats({
            total: data.total_leads || data.total || 0,
            today: data.today_leads || data.today || 0,
            week: data.week_leads || data.week || 0,
          });
        }
      } catch {
        // silent
      }
    })();
  }, []);

  const quickActions = [
    {
      icon: 'add-circle' as const,
      title: 'Capture Lead',
      description: 'Add new business lead',
      onPress: () => navigation.navigate('Capture'),
      color: colors.primary,
    },
    {
      icon: 'people' as const,
      title: 'View Leads',
      description: 'See all captured leads',
      onPress: () => navigation.navigate('Leads'),
      color: colors.success,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {user?.email?.split('@')[0] || 'User'}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isSuperAdmin ? 'Admin' : 'Sales Rep'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.today}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>{stats.week}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>This Week</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

      {quickActions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.actionCard, { backgroundColor: colors.surface }]}
          onPress={action.onPress}
        >
          <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
            <Ionicons name={action.icon} size={26} color={action.color} />
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
            <Text style={[styles.actionDescription, { color: colors.textMuted }]}>
              {action.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 15, marginTop: 4 },
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 12,
  },
  iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionText: { flex: 1, marginLeft: 14 },
  actionTitle: { fontSize: 16, fontWeight: '600' },
  actionDescription: { fontSize: 13, marginTop: 2 },
});
