import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';
import TowItem from '../components/TowItem';

interface Tow {
  id: string;
  vehicle_id: string;
  location: string;
  tow_date: string;
  reason: string | null;
  status: 'active' | 'released' | 'completed';
  license_plate?: string;
}

interface VehicleOption {
  id: string;
  license_plate: string;
}

export default function TowHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const [tows, setTows] = useState<Tow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    params.vehicle_id as string || null
  );

  useEffect(() => {
    if (session?.user) {
      fetchUserVehicles();
      fetchTowHistory();
    }
  }, [session, selectedVehicleId]);

  const fetchUserVehicles = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate')
        .eq('owner_id', session.user.id);

      if (error) throw error;

      setVehicles(data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error.message);
      Alert.alert('Error', 'Failed to load your vehicles');
    }
  };

  const fetchTowHistory = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('tows')
        .select(`
          id,
          vehicle_id,
          location,
          tow_date,
          reason,
          status,
          vehicles:vehicles(license_plate, owner_id)
        `)
        .eq('vehicles.owner_id', session.user.id);
        
      // If a specific vehicle is selected, filter by that vehicle
      if (selectedVehicleId) {
        query = query.eq('vehicle_id', selectedVehicleId);
      }
      
      // Order by most recent tows first
      query = query.order('tow_date', { ascending: false });
      
      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include license_plate in the main tow object
      const towsWithPlate = data?.map(tow => {
        // Handle the case where vehicles is an array
        if (tow.vehicles && Array.isArray(tow.vehicles) && tow.vehicles.length > 0) {
          return {
            ...tow,
            license_plate: tow.vehicles[0].license_plate,
          };
        }
        return tow;
      }) || [];

      setTows(towsWithPlate);
    } catch (error: any) {
      console.error('Error fetching tow history:', error.message);
      Alert.alert('Error', 'Failed to load tow history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTowHistory();
  };

  const handleTowPress = (id: string) => {
    // Navigate to tow details screen
    router.push({
      pathname: '/tow-details',
      params: { id }
    });
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="truck-pickup" size={60} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Tow Records</Text>
      <Text style={styles.emptySubtitle}>
        {selectedVehicleId 
          ? "This vehicle hasn't been towed yet." 
          : "None of your vehicles have been towed yet."}
      </Text>
    </View>
  );

  const VehicleFilter = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Filter by Vehicle:</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.filterOption,
            !selectedVehicleId && styles.filterOptionSelected,
          ]}
          onPress={() => setSelectedVehicleId(null)}
        >
          <Text
            style={[
              styles.filterText,
              !selectedVehicleId && styles.filterTextSelected,
            ]}
          >
            All Vehicles
          </Text>
        </TouchableOpacity>
        
        {vehicles.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[
              styles.filterOption,
              selectedVehicleId === vehicle.id && styles.filterOptionSelected,
            ]}
            onPress={() => setSelectedVehicleId(vehicle.id)}
          >
            <Text
              style={[
                styles.filterText,
                selectedVehicleId === vehicle.id && styles.filterTextSelected,
              ]}
            >
              {vehicle.license_plate}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {vehicles.length > 0 && <VehicleFilter />}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={tows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TowItem
              id={item.id}
              location={item.location}
              towDate={item.tow_date}
              status={item.status}
              reason={item.reason || undefined}
              onPress={handleTowPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            tows.length > 0 ? (
              <Text style={styles.resultCount}>{tows.length} tow record{tows.length !== 1 ? 's' : ''} found</Text>
            ) : null
          }
        />
      )}
    </View>
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
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  filterScrollContent: {
    paddingRight: 8,
  },
  filterOption: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 14,
    color: '#4B5563',
  },
  filterTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
}); 