import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface VehicleItemProps {
  id: string;
  licensePlate: string;
  model: string;
  color: string;
  onPress: (id: string) => void;
}

const getGradientColors = (color: string): string[] => {
  const colorMap: Record<string, string[]> = {
    'red': ['#FF6B6B', '#FF8E8E'],
    'blue': ['#5D9CEC', '#8EB5F0'],
    'green': ['#4CD97B', '#7AE19F'],
    'black': ['#3A4750', '#5C6670'],
    'white': ['#E7ECEF', '#F7FAFC'],
    'silver': ['#CBD5E1', '#E2E8F0'],
    'gray': ['#9CA3AF', '#D1D5DB'],
    'yellow': ['#FBBF24', '#FCD34D'],
    'orange': ['#F97316', '#FB923C'],
    'purple': ['#A78BFA', '#C4B5FD'],
    'brown': ['#92400E', '#B45309'],
  };
  
  // Default to a nice gradient if the color isn't in our map
  return colorMap[color.toLowerCase()] || ['#4F46E5', '#7C74EB'];
};

const VehicleItem: React.FC<VehicleItemProps> = ({
  id,
  licensePlate,
  model,
  color,
  onPress,
}) => {
  const gradientColors = getGradientColors(color);
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(id)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.plateContainer}>
          <Text style={styles.licensePlate}>{licensePlate}</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.infoContainer}>
        <View style={styles.detailsRow}>
          <View style={styles.iconTextContainer}>
            <FontAwesome5 name="car" size={14} color="#4F46E5" solid style={styles.detailIcon} />
            <Text style={styles.modelText}>{model}</Text>
          </View>
          
          <View style={styles.iconTextContainer}>
            <FontAwesome5 name="palette" size={14} color="#4F46E5" solid style={styles.detailIcon} />
            <Text style={styles.colorText}>{color}</Text>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onPress(id)}>
            <Text style={styles.actionText}>Details</Text>
            <FontAwesome5 name="chevron-right" size={12} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateContainer: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  licensePlate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 1,
  },
  infoContainer: {
    padding: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 6,
  },
  modelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  colorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    marginRight: 4,
  },
});

export default VehicleItem; 