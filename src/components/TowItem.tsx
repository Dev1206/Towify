import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';

interface TowItemProps {
  id: string;
  location: string;
  towDate: string;
  status: 'active' | 'released' | 'completed';
  reason?: string;
  onPress: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return '#EF4444'; // Red
    case 'released':
      return '#10B981'; // Green
    case 'completed':
      return '#6B7280'; // Gray
    default:
      return '#6B7280';
  }
};

const TowItem: React.FC<TowItemProps> = ({
  id,
  location,
  towDate,
  status,
  reason,
  onPress,
}) => {
  const formattedDate = towDate ? format(new Date(towDate), 'MMM dd, yyyy • h:mm a') : 'Unknown date';
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <FontAwesome5 name="truck-pickup" size={20} color="#4F46E5" />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        <Text style={styles.date}>{formattedDate}</Text>
        {reason && <Text style={styles.reason} numberOfLines={1}>Reason: {reason}</Text>}
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status) }]} />
        <Text style={styles.statusText}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  location: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
});

export default TowItem; 