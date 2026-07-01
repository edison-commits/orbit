import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getDaysInMonth = (month: number, year: number) => {
  if (month === 2) {
    const isLeapYear = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
    return isLeapYear ? 29 : 28;
  }
  return [1, 3, 5, 7, 8, 10, 12].includes(month) ? 31 : 30;
};

const currentYear = new Date().getFullYear();
const START_YEAR = 1900;
const YEARS = Array.from({ length: currentYear - START_YEAR + 1 }, (_, i) => currentYear - i);

interface BirthdayPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedHasYear, setSelectedHasYear] = useState(true);

  const parseValue = () => {
    if (!value) return { month: 1, day: 1, year: currentYear, hasYear: true };

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return { month: month || 1, day: day || 1, year: year || currentYear, hasYear: true };
    }

    if (/^\d{1,2}[-/]\d{1,2}$/.test(value)) {
      const [month, day] = value.split(/[-/]/).map(Number);
      return { month: month || 1, day: day || 1, year: 2000, hasYear: false };
    }

    const parts = value.split(' ');
    if (parts.length < 2) return { month: 1, day: 1, year: currentYear, hasYear: true };
    const monthStr = parts[0].replace(',', '');
    const month = MONTHS.findIndex((m) => m.startsWith(monthStr)) + 1 || 1;
    const dayPart = parts[1].replace(',', '').replace(/[^0-9]/g, '');
    const day = parseInt(dayPart) || 1;
    const hasYear = Boolean(parts[2]);
    const yearPart = parts[2] || '2000';
    const year = parseInt(yearPart) || currentYear;
    return { month, day, year, hasYear };
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleOpen = () => {
    const { month, day, year, hasYear } = parseValue();
    const validDaysForBirthday = getDaysInMonth(month, year);
    setSelectedMonth(month);
    setSelectedDay(Math.min(day, validDaysForBirthday));
    setSelectedYear(year);
    setSelectedHasYear(hasYear);
    setShowPicker(true);
  };

  const handleConfirm = () => {
    const monthStr = MONTHS[selectedMonth - 1];
    if (!selectedHasYear) {
      onChange(`${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
    } else {
      onChange(`${monthStr} ${selectedDay}, ${selectedYear}`);
    }
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  if (showPicker) {
    return (
      <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
        <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, marginBottom: 8 }}>
          Birthday — tap to select
        </Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerCol}>
            <Text variant="labelSmall" style={[styles.colLabel, { color: colors.onSurfaceVariant }]}>Month</Text>
            <ScrollView
              style={[styles.scrollCol, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
              showsVerticalScrollIndicator={false}
            >
              {MONTHS.map((m, i) => (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${m} as birthday month`}
                  accessibilityState={{ selected: selectedMonth === i + 1 }}
                  onPress={() => {
                    setSelectedMonth(i + 1);
                    const newDays = getDaysInMonth(i + 1, selectedYear);
                    if (selectedDay > newDays) setSelectedDay(newDays);
                  }}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.outlineVariant },
                    selectedMonth === i + 1 && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selectedMonth === i + 1 ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    {m.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.pickerCol}>
            <Text variant="labelSmall" style={[styles.colLabel, { color: colors.onSurfaceVariant }]}>Day</Text>
            <ScrollView
              style={[styles.scrollCol, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
              showsVerticalScrollIndicator={false}
            >
              {days.map((d) => (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${d} as birthday day`}
                  accessibilityState={{ selected: selectedDay === d }}
                  onPress={() => setSelectedDay(d)}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.outlineVariant },
                    selectedDay === d && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selectedDay === d ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.pickerCol}>
            <Text variant="labelSmall" style={[styles.colLabel, { color: colors.onSurfaceVariant }]}>Year</Text>
            <ScrollView
              style={[styles.scrollCol, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
              showsVerticalScrollIndicator={false}
            >
              {YEARS.map((y) => (
                <Pressable
                  key={y}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${y} as birthday year`}
                  accessibilityState={{ selected: selectedYear === y }}
                  onPress={() => {
                    setSelectedYear(y);
                    const newDays = getDaysInMonth(selectedMonth, y);
                    if (selectedDay > newDays) setSelectedDay(newDays);
                  }}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.outlineVariant },
                    selectedYear === y && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selectedYear === y ? colors.onPrimary : colors.onSurface },
                    ]}
                  >
                    {y}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: selectedHasYear }}
          accessibilityLabel="Toggle whether birthday year is known"
          onPress={() => setSelectedHasYear((value) => !value)}
          style={[styles.yearKnownToggle, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceVariant }]}
        >
          <Text style={{ color: colors.onSurfaceVariant }}>
            Year known: {selectedHasYear ? 'Yes' : 'No'}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel birthday selection"
            onPress={handleCancel}
            style={[styles.btn, styles.btnCancel, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}
          >
            <Text style={{ color: colors.onSurfaceVariant }}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm birthday selection"
            onPress={handleConfirm}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `Change birthday, currently ${value}` : 'Select birthday'}
      onPress={handleOpen}
      style={{
        borderColor: colors.outline,
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={{ color: value ? colors.onSurface : colors.onSurfaceVariant, fontSize: 16 }}>
        {value || 'Select birthday'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 56,
    justifyContent: 'center',
  },
  pickerContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerCol: {
    flex: 1,
  },
  colLabel: {
    textAlign: 'center',
    marginBottom: 8,
  },
  scrollCol: {
    maxHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
  },
  option: {
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  yearKnownToggle: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  btnCancel: {
    borderWidth: 1,
  },
});
