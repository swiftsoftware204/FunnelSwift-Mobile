import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';

export default function HomeScreen({ navigation }: any) {
  const { user, isSuperAdmin } = useAuth();
  const { colors } = useTheme();

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
    {
      icon: 'trending-up' as const,
      title: 'Analytics',
      description: 'View performance stats',
      onPress: () => {},
      color: colors.warning,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {user?.email?.split('@')[0] || 'User'}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isSuperAdmin ? 'Super Admin' : 'Sales Rep'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Leads Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>This Week</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>0</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>This Month</Text>
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
            <Ionicons name={action.icon} size={28} color={action.color} />
          </View>
          <View style={styles.actionText}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
            <Text style={[styles.actionDescription, { color: colors.textMuted }]}>
              {action.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});
