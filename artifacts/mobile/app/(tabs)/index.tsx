import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Empty } from '@/components/ui';
import { ProjectCard } from '@/components/ProjectCard';
import { MOCK_PROJECTS, type ProjectStatus } from '@/lib/data';

const FILTERS: Array<'All' | ProjectStatus> = [
  'All',
  'Current',
  'Overdue',
  'On Hold',
  'Completed',
  'Archived',
];

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'All' | ProjectStatus>('All');

  const projects = useMemo(
    () => (filter === 'All' ? MOCK_PROJECTS : MOCK_PROJECTS.filter((p) => p.status === filter)),
    [filter],
  );

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Projects</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Track the status of every engagement at a glance.
        </Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                testID={`project-filter-${f}`}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.secondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.primaryForeground : colors.secondaryForeground },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProjectCard project={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        scrollEnabled={projects.length > 0}
        ListEmptyComponent={
          <Empty
            icon="folder"
            title="No projects yet"
            description="Projects will appear here once they're created. Adjust the status filter to see other work."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
});
