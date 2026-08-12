import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Empty } from '@/components/ui';
import { TaskCard } from '@/components/TaskCard';
import { MOCK_TASKS, TASK_STATUSES, type TaskStatus } from '@/lib/data';

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');

  const tasks = useMemo(
    () => (filter === 'All' ? MOCK_TASKS : MOCK_TASKS.filter((t) => t.status === filter)),
    [filter],
  );

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Tasks</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          View and manage tasks assigned to you across all projects.
        </Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {TASK_STATUSES.map((s) => {
            const active = s === filter;
            return (
              <Pressable
                key={s}
                testID={`task-filter-${s}`}
                onPress={() => setFilter(s)}
                style={[
                  styles.filterPill,
                  { backgroundColor: active ? colors.primary : colors.secondary },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.primaryForeground : colors.secondaryForeground },
                  ]}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskCard task={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        scrollEnabled={tasks.length > 0}
        ListEmptyComponent={
          <Empty
            icon="check-square"
            title="No tasks yet"
            description="Tasks assigned to you will appear here. Once your team starts assigning work, you'll see everything in one place."
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
