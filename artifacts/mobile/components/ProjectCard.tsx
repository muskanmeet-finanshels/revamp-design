import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AvatarStack, DueDate, StatusChip } from '@/components/ui';
import type { Project } from '@/lib/data';

export function ProjectCard({ project }: { project: Project }) {
  const colors = useColors();
  const people = [...project.teamLeads, ...project.assignees];
  const done = project.status === 'Completed' || project.status === 'Archived';

  return (
    <Pressable
      testID={`project-card-${project.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {project.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.clientDot, { backgroundColor: project.client.color }]} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {project.client.name} · {project.serviceType.label}
            </Text>
          </View>
        </View>
        <StatusChip status={project.status} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${project.progress}%`,
                backgroundColor: project.progress === 100 ? colors.success : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
          {project.tasksCompleted}/{project.tasksTotal}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <DueDate label={project.dueDate} done={done} />
        {people.length > 0 ? <AvatarStack members={people} /> : <View />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: '#082032',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
