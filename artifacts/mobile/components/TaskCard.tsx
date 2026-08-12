import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Avatar, DueDate, StatusChip } from '@/components/ui';
import { Feather } from '@expo/vector-icons';
import { useTimer } from '@/contexts/TimerContext';
import type { Task } from '@/lib/data';

export function TaskCard({ task }: { task: Task }) {
  const colors = useColors();
  const { taskId, active, startTimer, stopTimer } = useTimer();
  const done = task.status === 'Completed';

  const isTimingThisTask = active && taskId === task.id;

  function handleTimerPress() {
    if (isTimingThisTask) {
      stopTimer();
    } else {
      startTimer(task.id, task.title);
    }
  }

  return (
    <Pressable
      testID={`task-card-${task.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isTimingThisTask ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: done ? colors.success : colors.input,
            backgroundColor: done ? colors.success : 'transparent',
          },
        ]}
      >
        {done && <Feather name="check" size={12} color="#ffffff" />}
      </View>

      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            {
              color: done ? colors.mutedForeground : colors.foreground,
              textDecorationLine: done ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.clientDot, { backgroundColor: task.client.color }]} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {task.client.name} · {task.projectTitle}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <StatusChip status={task.status} />
          <DueDate label={task.dueDate} done={done} />
        </View>
      </View>

      <View style={styles.rightCol}>
        <Avatar member={task.assignee} size={28} />

        {/* Timer toggle — hidden for completed tasks */}
        {!done && (
          <Pressable
            onPress={handleTimerPress}
            hitSlop={6}
            style={({ pressed }) => [
              styles.timerBtn,
              {
                backgroundColor: isTimingThisTask
                  ? colors.primary
                  : colors.secondary,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityLabel={isTimingThisTask ? 'Stop timer' : 'Start timer'}
          >
            <Feather
              name={isTimingThisTask ? 'square' : 'clock'}
              size={13}
              color={isTimingThisTask ? '#fff' : colors.mutedForeground}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#082032',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  metaText: {
    fontSize: 12,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'center',
    gap: 8,
  },
  timerBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
