import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { MOCK_PROJECTS, MOCK_TASKS } from '@/lib/data';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const activeProjects = MOCK_PROJECTS.filter(
    (p) => p.status === 'Current' || p.status === 'Overdue',
  ).length;
  const openTasks = MOCK_TASKS.filter((t) => t.status !== 'Completed').length;
  const completedTasks = MOCK_TASKS.filter((t) => t.status === 'Completed').length;

  const rows: Array<{ icon: React.ComponentProps<typeof Feather>['name']; label: string }> = [
    { icon: 'bell', label: 'Notifications' },
    { icon: 'settings', label: 'Preferences' },
    { icon: 'help-circle', label: 'Help & support' },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topInset + 12 }]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>

      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>AK</Text>
        </View>
        <View>
          <Text style={[styles.name, { color: colors.foreground }]}>Arjun Kumar</Text>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>
            Team Lead · Finanshels
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { value: activeProjects, label: 'Active projects' },
          { value: openTasks, label: 'Open tasks' },
          { value: completedTasks, label: 'Completed' },
        ].map((s) => (
          <View
            key={s.label}
            style={[styles.statCard, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.menu, { borderColor: colors.border }]}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.menuRow,
              i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <Feather name={row.icon} size={18} color={colors.info} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{row.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 18,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  name: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
  },
  role: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  menu: {
    borderWidth: 1,
    borderRadius: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
});
