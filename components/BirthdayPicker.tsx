import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { orbitTheme } from '@/lib/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getDaysInMonth = (month: number, year: number) => {
  if (month === 2) return year % 4 === 0 ? 29 : 28;
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
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const parseValue = () => {
    if (!value) return { month: 1, day: 1, year: currentYear };
    const parts = value.split(' ');
    if (parts.length < 2) return { month: 1, day: 1, year: currentYear };
    const monthStr = parts[0].replace(',', '');
    const month = MONTHS.findIndex((m) => m.startsWith(monthStr)) + 1 || 1;
    const dayPart = parts[1].replace(',', '').replace(/[^0-9]/g, '');
    const day = parseInt(dayPart) || 1;
    const yearPart = parts[2] || String(currentYear);
    const year = parseInt(yearPart) || currentYear;
    return { month, day, year };
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleOpen = () => {
    const { month, day, year } = parseValue();
    setSelectedMonth(month);
    setSelectedDay(Math.min(day, daysInMonth));
    setSelectedYear(year);
    setShowPicker(true);
  };

  const handleConfirm = () => {
    const monthStr = MONTHS[selectedMonth - 1];
    onChange(`${monthStr} ${selectedDay}, ${selectedYear}`);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  if (showPicker) {
    return (
      <View style={styles.pickerContainer}>
        <Text variant="labelMedium" style={{ color: '#666', marginBottom: 8 }}>
          Birthday — tap to select
        </Text>
        <View style={styles.pickerRow}>
          <View style={styles.pickerCol}>
            <Text variant="labelSmall" style={styles.colLabel}>Month</Text>
            <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
              {MONTHS.map((m, i) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setSelectedMonth(i + 1);
                    const newDays = getDaysInMonth(i + 1, selectedYear);
                    if (selectedDay > newDays) setSelectedDay(newDays);
                  }}
                  style={[
                    styles.option,
                    selectedMonth === i + 1 && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedMonth === i + 1 && styles.optionTextSelected,
                    ]}
                  >
                    {m.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.pickerCol}>
            <Text variant="labelSmall" style={styles.colLabel}>Day</Text>
            <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
              {days.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  style={[
                    styles.option,
                    selectedDay === d && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedDay === d && styles.optionTextSelected,
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.pickerCol}>
            <Text variant="labelSmall" style={styles.colLabel}>Year</Text>
            <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
              {YEARS.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => {
                    setSelectedYear(y);
                    const newDays = getDaysInMonth(selectedMonth, y);
                    if (selectedDay > newDays) setSelectedDay(newDays);
                  }}
                  style={[
                    styles.option,
                    selectedYear === y && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedYear === y && styles.optionTextSelected,
                    ]}
                  >
                    {y}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable onPress={handleCancel} style={[styles.btn, styles.btnCancel]}>
            <Text style={{ color: '#666' }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleConfirm} style={[styles.btn, styles.btnDone]}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleOpen}
      style={{
        borderColor: '#79747E',
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
      }}
    >
      <Text style={{ color: value ? '#1C1B1F' : '#9E9E9E', fontSize: 16 }}>
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
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#888',
    marginBottom: 8,
  },
  scrollCol: {
    maxHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#fff',
  },
  option: {
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionSelected: {
    backgroundColor: orbitTheme.colors.primary + '20',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  optionTextSelected: {
    color: orbitTheme.colors.primary,
    fontWeight: '700',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  btnCancel: {
    backgroundColor: '#E8E8E8',
  },
  btnDone: {
    backgroundColor: orbitTheme.colors.primary,
  },
});
