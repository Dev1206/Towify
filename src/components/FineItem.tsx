import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';

interface FineItemProps {
  id: string;
  amount: number;
  description: string;
  issueDate: string;
  dueDate?: string;
  status: 'unpaid' | 'paid' | 'overdue';
  licensePlate: string;
  onPress: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'unpaid':
      return '#F59E0B'; // Amber/Yellow
    case 'overdue':
      return '#EF4444'; // Red
    case 'paid':
      return '#10B981'; // Green
    default:
      return '#6B7280'; // Gray
  }
};

const FineItem: React.FC<FineItemProps> = ({
  id,
  amount,
  description,
  issueDate,
  dueDate,
  status,
  licensePlate,
  onPress,
}) => {
  const formattedIssueDate = issueDate ? format(new Date(issueDate), 'MMM dd, yyyy') : 'Unknown date';
  const formattedDueDate = dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : 'No due date';
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name="money-bill-wave" size={16} color="#4F46E5" />
        </View>
        <Text style={styles.description} numberOfLines={1}>{description}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.middleRow}>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
        <Text style={styles.plate}>{licensePlate}</Text>
      </View>
      
      <View style={styles.bottomRow}>
        <Text style={styles.dateLabel}>Issued: <Text style={styles.dateValue}>{formattedIssueDate}</Text></Text>
        {dueDate && (
          <Text style={styles.dateLabel}>Due: <Text style={styles.dateValue}>{formattedDueDate}</Text></Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  description: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  plate: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateValue: {
    color: '#374151',
  },
});

export default FineItem; 