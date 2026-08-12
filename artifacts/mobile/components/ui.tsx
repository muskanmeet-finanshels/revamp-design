import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import type { ProjectStatus, TaskStatus, TeamMember } from '@/lib/data';
import { parseDueDate } from '@/lib/data';

/* ── Status chip ── */

type ChipStatus = ProjectStatus | TaskStatus;

export function StatusChip({ status }: { status: ChipStatus }) {
  const colors = useColors();

  const palette: Record<string, { bg: string; fg: string }> = {
    Current: { bg: colors.successSoft, fg: colors.success },
    'In Progress': { bg: colors.primarySoft, fg: colors.primary },
    Overdue: { bg: colors.destructiveSoft, fg: colors.destructive },
    'On Hold': { bg: colors.warningSoft, fg: '#C1520E' },
    Completed: { bg: colors.infoSoft, fg: colors.info },
    Archived: { bg: colors.secondary, fg: colors.mutedForeground },
    'To Do': { bg: colors.secondary, fg: colors.secondaryForeground },
  };
  const tone = palette[status] ?? { bg: colors.secondary, fg: colors.foreground };

  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.chipText, { color: tone.fg }]}>{status}</Text>
    </View>
  );
}

/* ── Due date indicator ── */

const TODAY = new Date(2026, 7, 3); // matches project reference date

export function DueDate({ label, done }: { label: string; done?: boolean }) {
  const colors = useColors();
  const due = parseDueDate(label);
  const overdue = !done && due !== null && due < TODAY;
  const soon =
    !done &&
    !overdue &&
    due !== null &&
    due.getTime() - TODAY.getTime() < 1000 * 60 * 60 * 24 * 7;

  const tint = done
    ? colors.mutedForeground
    : overdue
      ? colors.destructive
      : soon
        ? '#C1520E'
        : colors.mutedForeground;

  return (
    <View style={styles.dueRow}>
      <Feather name={overdue ? 'alert-circle' : 'calendar'} size={12} color={tint} />
      <Text style={[styles.dueText, { color: tint, fontFamily: overdue || soon ? 'Poppins_500Medium' : 'Poppins_400Regular' }]}>
        {label}
      </Text>
    </View>
  );
}

/* ── Avatar ── */

export function Avatar({ member, size = 26 }: { member: TeamMember; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: member.color,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{member.initials}</Text>
    </View>
  );
}

export function AvatarStack({ members, max = 3 }: { members: TeamMember[]; max?: number }) {
  const colors = useColors();
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <View style={styles.stack}>
      {shown.map((m, i) => (
        <View key={`${m.initials}-${i}`} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar member={m} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.avatar,
            {
              width: 26,
              height: 26,
              borderRadius: 13,
              marginLeft: -8,
              backgroundColor: colors.secondary,
            },
          ]}
        >
          <Text style={[styles.avatarText, { fontSize: 10, color: colors.secondaryForeground }]}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ── Empty state (matches web Empty pattern & copy) ── */

export function Empty({
  icon,
  title,
  description,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty} testID="empty-state">
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={22} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 12,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
