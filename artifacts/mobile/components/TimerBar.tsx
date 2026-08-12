import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTimer } from '@/contexts/TimerContext';
import { useColors } from '@/hooks/useColors';

const REMINDER_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function useElapsed(): number {
  const { startedAt, totalPausedMs, pausedAt, active } = useTimer();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!startedAt) return 0;
  const base = (pausedAt ?? now) - startedAt - totalPausedMs;
  return Math.max(0, base);
}

/** Height of the standard tab bar (excluding safe-area inset). */
const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 84 : 49;

export function TimerBar() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { active, running, taskName, startedAt, pauseTimer, resumeTimer, stopTimer } =
    useTimer();
  const elapsedMs = useElapsed();

  /* slide-up / slide-down animation */
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [active]);

  /* long-running reminder banner */
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const prevStartedAtRef = useRef<number | null>(null);

  // Reset dismissed state whenever a new timer session begins
  useEffect(() => {
    if (startedAt !== prevStartedAtRef.current) {
      prevStartedAtRef.current = startedAt;
      if (startedAt !== null) setReminderDismissed(false);
    }
  }, [startedAt]);

  const showReminder =
    active && !reminderDismissed && elapsedMs >= REMINDER_THRESHOLD_MS;

  if (!active) return null;

  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [56, 0],
  });

  return (
    <>
      {/* Long-running reminder banner */}
      {showReminder && (
        <View
          style={[
            styles.reminderBanner,
            { bottom: bottomOffset + 48, backgroundColor: '#F59E0B' },
          ]}
        >
          <Feather name="clock" size={14} color="#fff" style={styles.reminderIcon} />
          <Text style={styles.reminderText} numberOfLines={2}>
            Timer has been running for over 4 hours. Still working?
          </Text>
          <Pressable
            onPress={() => setReminderDismissed(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.reminderDismiss,
              pressed && styles.reminderDismissPressed,
            ]}
            accessibilityLabel="Dismiss reminder"
          >
            <Feather name="x" size={14} color="#fff" />
          </Pressable>
        </View>
      )}

      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: colors.primary,
            bottom: bottomOffset,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* pulsing dot */}
        <View style={styles.dotWrapper}>
          <View
            style={[
              styles.dot,
              { backgroundColor: running ? '#fff' : 'rgba(255,255,255,0.45)' },
            ]}
          />
        </View>

        {/* task name + elapsed */}
        <View style={styles.info}>
          <Text style={styles.taskName} numberOfLines={1}>
            {taskName || 'Timer running'}
          </Text>
          <Text style={styles.elapsed}>{formatElapsed(elapsedMs)}</Text>
        </View>

        {/* pause / resume */}
        <Pressable
          onPress={running ? pauseTimer : resumeTimer}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel={running ? 'Pause timer' : 'Resume timer'}
        >
          <Feather
            name={running ? 'pause' : 'play'}
            size={18}
            color="#fff"
          />
        </Pressable>

        {/* stop */}
        <Pressable
          onPress={stopTimer}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Stop timer"
        >
          <Feather name="square" size={18} color="#fff" />
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    gap: 10,
    zIndex: 100,
    // shadow (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    // elevation (Android)
    elevation: 8,
  },
  dotWrapper: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  taskName: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.1,
  },
  elapsed: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
    minWidth: 48,
    textAlign: 'right',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  reminderBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
    zIndex: 99,
    // shadow (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -1 },
    // elevation (Android)
    elevation: 7,
  },
  reminderIcon: {
    flexShrink: 0,
  },
  reminderText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    lineHeight: 17,
  },
  reminderDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    flexShrink: 0,
  },
  reminderDismissPressed: {
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
});
