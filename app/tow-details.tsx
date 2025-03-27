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
import { supabase } from '../src/api/supabase';
import { useSession } from '../src/context/SessionContext';
import { format } from 'date-fns';

interface TowDetails {
  id: string;
  vehicle_id: string;
  location: string;
  tow_date: string;
  reason: string | null;
  status: 'active' | 'released' | 'completed';
  license_plate: string;
  model: string;
  color: string;
}

export default function TowDetailsScreen() {
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
      const { data, error } = await supabase
        .from('tows')
        .select(`
          id,
          vehicle_id,
          location,
          tow_date,
          reason,
          status,
          vehicles!inner(license_plate, model, color, owner_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Handle vehicles data which could be an array or an object
      const vehicleData = Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles;

      // Check if this tow record belongs to the user's vehicle
      if (vehicleData.owner_id !== session.user.id) {
        throw new Error('Unauthorized');
      }

      // Transform data to include vehicle details in the main tow object
      const towWithVehicleDetails = {
        ...data,
        license_plate: vehicleData.license_plate,
        model: vehicleData.model,
        color: vehicleData.color,
      };

      setTowDetails(towWithVehicleDetails);
    } catch (error: any) {
      console.error('Error fetching tow details:', error.message);
      
      if (error.message === 'Unauthorized') {
        Alert.alert('Error', 'You are not authorized to view this tow record');
      } else {
        Alert.alert('Error', 'Failed to load tow details');
      }
      
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = () => {
    if (!towDetails) return;
    
    router.push({
      pathname: '/complaint',
      params: { 
        tow_id: towDetails.id,
        vehicle_id: towDetails.vehicle_id,
        type: 'tow'
      }
    });
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
            <Text style={styles.dataValue}>{towDetails.model}</Text>
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
                {towDetails.color.charAt(0).toUpperCase() + towDetails.color.slice(1)}
              </Text>
            </View>
          </View>
        </View>

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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSubmitComplaint}
          >
            <FontAwesome5 name="comment-alt" size={16} color="white" style={styles.actionIcon} />
            <Text style={styles.actionText}>Submit Complaint</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
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
    margin: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 