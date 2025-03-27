import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../src/api/supabase';
import { useSession } from '../src/context/SessionContext';

interface Vehicle {
  id: string;
  license_plate: string;
  model: string;
  color: string;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { session } = useSession();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleDetails();
  }, [id]);

  const fetchVehicleDetails = async () => {
    if (!id || !session?.user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .eq('owner_id', session.user.id)
        .single();

      if (error) {
        throw error;
      }

      setVehicle(data);
    } catch (error: any) {
      console.error('Error fetching vehicle details:', error);
      Alert.alert('Error', 'Failed to load vehicle details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = () => {
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteVehicle,
        },
      ]
    );
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicle?.id || !session?.user) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id)
        .eq('owner_id', session.user.id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Vehicle deleted successfully');
      router.back();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      Alert.alert('Error', 'Failed to delete vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTowHistory = () => {
    if (!vehicle) return;
    router.push({
      pathname: '/tow-history',
      params: { vehicle_id: vehicle.id, plate: vehicle.license_plate }
    });
  };

  const handleViewFines = () => {
    if (!vehicle) return;
    router.push({
      pathname: '/fine-history',
      params: { vehicle_id: vehicle.id, plate: vehicle.license_plate }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Vehicle not found</Text>
      </View>
    );
  }

  const ActionButton = ({ icon, label, onPress, color = '#4F46E5' }: ActionButtonProps) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <FontAwesome5 name={icon} size={20} color="#FFFFFF" style={styles.actionIcon} />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Vehicle Details',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F7F9FC',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.vehicleInfoCard}>
          <View style={styles.plateContainer}>
            <Text style={styles.plateText}>{vehicle.license_plate}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Model:</Text>
            <Text style={styles.infoValue}>{vehicle.model}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Color:</Text>
            <View style={styles.colorInfo}>
              <View 
                style={[
                  styles.colorDot, 
                  { backgroundColor: vehicle.color === 'white' ? '#F9FAFB' : vehicle.color }
                ]} 
              />
              <Text style={styles.infoValue}>
                {vehicle.color.charAt(0).toUpperCase() + vehicle.color.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <View style={styles.actionButtonsContainer}>
            <ActionButton 
              icon="history" 
              label="Tow History" 
              onPress={handleViewTowHistory} 
            />
            
            <ActionButton 
              icon="money-bill-wave" 
              label="View Fines" 
              onPress={handleViewFines} 
            />
            
            <ActionButton 
              icon="trash-alt" 
              label="Delete Vehicle" 
              onPress={handleDeleteVehicle}
              color="#EF4444" 
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  vehicleInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  plateContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  plateText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  colorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionsContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 