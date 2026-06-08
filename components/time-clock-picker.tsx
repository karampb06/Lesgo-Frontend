import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TimePickerMode = 'hour' | 'minute';

type TimeClockPickerProps = {
  visible: boolean;
  title: string;
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
};

// Turns the stored 24-hour value into the friendly text shown on buttons.
export function formatTimeDisplay(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return time;
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatTimeParts(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const displayHour = Number.isFinite(hour) ? hour % 12 || 12 : 6;

  return {
    hourLabel: String(displayHour).padStart(2, '0'),
    minuteLabel: String(Number.isFinite(minute) ? minute : 0).padStart(2, '0'),
    period: hour >= 12 ? 'PM' : 'AM',
  };
}

function getClockPosition(index: number, total: number, radius = 105, center = 123) {
  // Place each option around the circle like numbers on a real clock.
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;

  return {
    left: center + radius * Math.cos(angle),
    top: center + radius * Math.sin(angle),
  };
}

function getClockHours() {
  return Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return {
      value,
      label: String(value),
      position: getClockPosition(index, 12),
    };
  });
}

function getClockMinutes() {
  return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((value, index) => ({
    value,
    label: String(value).padStart(2, '0'),
    position: getClockPosition(index, 12),
  }));
}

function getSelectedClockValue(time: string, mode: TimePickerMode) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (mode === 'hour') {
    return Number.isFinite(hour) ? hour % 12 || 12 : 6;
  }

  return Math.round((Number.isFinite(minute) ? minute : 0) / 5) * 5;
}

function updateTimePart(time: string, mode: TimePickerMode, value: number) {
  const [hourText, minuteText] = time.split(':');
  const currentHour = Number(hourText);
  const currentMinute = Number(minuteText);

  if (mode === 'minute') {
    return `${String(Number.isFinite(currentHour) ? currentHour : 18).padStart(2, '0')}:${String(value).padStart(2, '0')}`;
  }

  const isPm = Number.isFinite(currentHour) ? currentHour >= 12 : true;
  const hour24 = isPm ? (value === 12 ? 12 : value + 12) : value === 12 ? 0 : value;
  return `${String(hour24).padStart(2, '0')}:${String(Number.isFinite(currentMinute) ? currentMinute : 0).padStart(2, '0')}`;
}

function toggleTimePeriod(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const nextHour = ((Number.isFinite(hour) ? hour : 18) + 12) % 24;

  return `${String(nextHour).padStart(2, '0')}:${String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')}`;
}

export function TimeClockPicker({ visible, title, value, onChange, onClose }: TimeClockPickerProps) {
  const [mode, setMode] = React.useState<TimePickerMode>('hour');

  React.useEffect(() => {
    if (visible) {
      // Every time the clock opens, start with hours first.
      setMode('hour');
    }
  }, [visible]);

  const options = mode === 'hour' ? getClockHours() : getClockMinutes();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.timePickerPanel}>
          <View style={styles.timePickerHeader}>
            <Ionicons name="time-outline" size={20} color="#1f5d86" />
            <Text style={styles.calendarTitle}>{title}</Text>
            <TouchableOpacity style={styles.calendarNavButton} onPress={onClose} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.selectedTimeDisplay}>
            <TouchableOpacity
              style={[styles.timeModeButton, mode === 'hour' && styles.activeTimeModeButton]}
              onPress={() => setMode('hour')}
              activeOpacity={0.85}
            >
              <Text style={[styles.timeModeText, mode === 'hour' && styles.activeTimeModeText]}>
                {formatTimeParts(value).hourLabel}
              </Text>
            </TouchableOpacity>
            <Text style={styles.timeSeparator}>:</Text>
            <TouchableOpacity
              style={[styles.timeModeButton, mode === 'minute' && styles.activeTimeModeButton]}
              onPress={() => setMode('minute')}
              activeOpacity={0.85}
            >
              <Text style={[styles.timeModeText, mode === 'minute' && styles.activeTimeModeText]}>
                {formatTimeParts(value).minuteLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.periodToggle}
              onPress={() => onChange(toggleTimePeriod(value))}
              activeOpacity={0.85}
            >
              <Text style={styles.periodToggleText}>{formatTimeParts(value).period}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.clockFace}>
            <View style={styles.clockCenter} />
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.clockOption,
                  option.position,
                  option.value === getSelectedClockValue(value, mode) && styles.selectedClockOption,
                ]}
                onPress={() => {
                  onChange(updateTimePart(value, mode, option.value));
                  if (mode === 'hour') {
                    setMode('minute');
                  }
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.clockOptionText,
                    option.value === getSelectedClockValue(value, mode) && styles.selectedClockOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.timeDoneButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.timeDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  timePickerPanel: {
    width: '100%',
    maxHeight: '72%',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 18,
  },

  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  calendarTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },

  calendarNavButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },

  timeModeButton: {
    minWidth: 58,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#eef2fa',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTimeModeButton: {
    backgroundColor: '#1f5d86',
  },

  timeModeText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },

  activeTimeModeText: {
    color: '#ffffff',
  },

  timeSeparator: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },

  periodToggle: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  periodToggleText: {
    color: '#1f5d86',
    fontSize: 13,
    fontWeight: '900',
  },

  clockFace: {
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: '#f1f5f9',
    alignSelf: 'center',
    marginBottom: 16,
  },

  clockCenter: {
    position: 'absolute',
    left: 139,
    top: 139,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1f5d86',
  },

  clockOption: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedClockOption: {
    backgroundColor: '#1f5d86',
  },

  clockOptionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },

  selectedClockOptionText: {
    color: '#ffffff',
  },

  timeDoneButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1f5d86',
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeDoneText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
