import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../src/api/supabase';
import { useSession } from '../../src/context/SessionContext';
import { format } from 'date-fns';

interface TowDetails {
  id: string;
  vehicle_id: string;
  location: string;
  tow_date: string;
  reason: string | null;
  status: string;
  request_status: string;
  license_plate: string;
  model: string;
  color: string;
  registered_name?: string;
  vehicle_owner?: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;
}

export default function StaffTowDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const [towDetails, setTowDetails] = useState<TowDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTowDetails();
  }, [id]);

  const fetchTowDetails = async () => {
    if (!id || !session?.user) return;

    try {
      setLoading(true);
      // First fetch the basic tow data
      const { data: towData, error: towError } = await supabase
        .from('tows')
        .select(`
          id,
          vehicle_id,
          location,
          tow_date,
          reason,
          status,
          request_status,
          notes,
          created_at,
          created_by,
          assigned_to
        `)
        .eq('id', id)
        .single();

      if (towError) throw towError;

      // Fetch the vehicle data separately
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`
          license_plate,
          model,
          make,
          color,
          registered_name,
          owner_id
        `)
        .eq('id', towData.vehicle_id)
        .single();

      if (vehicleError) throw vehicleError;

      // Fetch owner profile if available
      let ownerProfile = null;
      if (vehicleData.owner_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            phone
          `)
          .eq('id', vehicleData.owner_id)
          .single();

        if (!profileError && profileData) {
          ownerProfile = profileData;
        }
      }

      // Combine the data
      const towWithVehicleDetails: TowDetails = {
        ...towData,
        license_plate: vehicleData.license_plate,
        model: vehicleData.model,
        color: vehicleData.color,
        registered_name: vehicleData.registered_name,
        vehicle_owner: ownerProfile
      };

      setTowDetails(towWithVehicleDetails);
    } catch (error: any) {
      console.error('Error fetching tow details:', error.message);
      Alert.alert('Error', 'Failed to load tow details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!towDetails || !session?.user) return;
    
    try {
      const { error } = await supabase
        .from('tows')
        .update({ 
          status: newStatus,
          request_status: newStatus === 'completed' ? 'completed' : towDetails.request_status
        })
        .eq('id', towDetails.id);
        
      if (error) throw error;
      
      // Create notification for vehicle owner
      if (towDetails.vehicle_owner?.id) {
        const notificationData = {
          user_id: towDetails.vehicle_owner.id,
          type: 'tow_update',
          title: `Tow ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
          message: `The status of your vehicle (${towDetails.license_plate}) tow has been updated to ${newStatus}.`,
          related_id: towDetails.id,
          is_read: false,
        };
        
        await supabase.from('notifications').insert(notificationData);
      }
      
      Alert.alert('Success', 'Tow status updated successfully');
      fetchTowDetails();
    } catch (error: any) {
      console.error('Error updating tow status:', error.message);
      Alert.alert('Error', 'Failed to update tow status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!towDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tow record not found</Text>
      </View>
    );
  }

  const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending':
          return '#F59E0B'; // Amber
        case 'active':
          return '#EF4444'; // Red
        case 'completed':
          return '#10B981'; // Green
        default:
          return '#6B7280'; // Gray
      }
    };

    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
        <Text style={styles.statusText}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tow Details',
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
        <View style={styles.header}>
          <FontAwesome5 name="truck-pickup" size={24} color="#4F46E5" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Tow Report</Text>
          <StatusIndicator status={towDetails.status} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="car" size={16} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>License Plate:</Text>
            <Text style={styles.dataValue}>{towDetails.license_plate}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Model:</Text>
            <Text style={styles.dataValue}>{towDetails.model || 'N/A'}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Color:</Text>
            <View style={styles.colorContainer}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: towDetails.color === 'white' ? '#F9FAFB' : towDetails.color },
                ]}
              />
              <Text style={styles.dataValue}>
                {towDetails.color ? (towDetails.color.charAt(0).toUpperCase() + towDetails.color.slice(1)) : 'N/A'}
              </Text>
            </View>
          </View>
          
          {towDetails.registered_name && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Registered To:</Text>
              <Text style={styles.dataValue}>{towDetails.registered_name}</Text>
            </View>
          )}
        </View>

        {towDetails.vehicle_owner && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="user" size={16} color="#4F46E5" />
              <Text style={styles.sectionTitle}>Owner Information</Text>
            </View>
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Name:</Text>
              <Text style={styles.dataValue}>{towDetails.vehicle_owner.full_name || 'N/A'}</Text>
            </View>
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Email:</Text>
              <Text style={styles.dataValue}>{towDetails.vehicle_owner.email}</Text>
            </View>
            
            {towDetails.vehicle_owner.phone && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Phone:</Text>
                <Text style={styles.dataValue}>{towDetails.vehicle_owner.phone}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="map-marker-alt" size={16} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Tow Information</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Location:</Text>
            <Text style={styles.dataValue}>{towDetails.location}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Date & Time:</Text>
            <Text style={styles.dataValue}>
              {format(new Date(towDetails.tow_date), 'MMM dd, yyyy • h:mm a')}
            </Text>
          </View>
          
          {towDetails.reason && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Reason:</Text>
              <Text style={styles.dataValue}>{towDetails.reason}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionCard}>
          {towDetails.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleUpdateStatus('completed')}
            >
              <FontAwesome5 name="check-circle" size={16} color="white" style={styles.actionIcon} />
              <Text style={styles.actionText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
          
          {towDetails.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444', marginTop: 12 }]}
              onPress={() => handleUpdateStatus('active')}
            >
              <FontAwesome5 name="truck-pickup" size={16} color="white" style={styles.actionIcon} />
              <Text style={styles.actionText}>Start Towing</Text>
            </TouchableOpacity>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.5,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dataLabel: {
    width: 100,
    fontSize: 14,
    color: '#6B7280',
  },
  dataValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionCard: {
    padding: 16,
    margin: 16,
    marginTop: 0,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 