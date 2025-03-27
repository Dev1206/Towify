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
import FineItem from '../components/FineItem';

interface Fine {
  id: string;
  vehicle_id: string;
  amount: number;
  description: string;
  issue_date: string;
  due_date: string | null;
  status: 'unpaid' | 'paid' | 'overdue';
  license_plate?: string;
}

interface VehicleOption {
  id: string;
  license_plate: string;
}

export default function FineHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    params.vehicle_id as string || null
  );
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchUserVehicles();
      fetchFineHistory();
    }
  }, [session, selectedVehicleId, statusFilter]);

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

  const fetchFineHistory = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('fines')
        .select(`
          id,
          vehicle_id,
          amount,
          description,
          issue_date,
          due_date,
          status,
          vehicles:vehicles(license_plate, owner_id)
        `)
        .eq('vehicles.owner_id', session.user.id);
        
      // If a specific vehicle is selected, filter by that vehicle
      if (selectedVehicleId) {
        query = query.eq('vehicle_id', selectedVehicleId);
      }
      
      // If a status filter is applied
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      // Order by most recent first
      query = query.order('issue_date', { ascending: false });
      
      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include license_plate in the main fine object
      const finesWithPlate = data?.map(fine => {
        // Handle the case where vehicles is an array
        if (fine.vehicles && Array.isArray(fine.vehicles) && fine.vehicles.length > 0) {
          return {
            ...fine,
            license_plate: fine.vehicles[0].license_plate,
          };
        }
        return fine;
      }) || [];

      setFines(finesWithPlate);
    } catch (error: any) {
      console.error('Error fetching fine history:', error.message);
      Alert.alert('Error', 'Failed to load fine history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFineHistory();
  };

  const handleFinePress = (id: string) => {
    // Navigate to fine details and payment screen
    router.push({
      pathname: '/fine-details',
      params: { id }
    });
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="money-bill-wave" size={60} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Fines Found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedVehicleId 
          ? "This vehicle doesn't have any fines" 
          : "You don't have any fines"}
        {statusFilter ? ` with status "${statusFilter}"` : ''}
      </Text>
    </View>
  );

  const VehicleFilter = () => (
    <View style={styles.filterSection}>
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

  const StatusFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>Filter by Status:</Text>
      <View style={styles.statusFilterContainer}>
        <TouchableOpacity
          style={[
            styles.statusFilterOption,
            !statusFilter && styles.statusFilterSelected,
          ]}
          onPress={() => setStatusFilter(null)}
        >
          <Text
            style={[
              styles.statusFilterText,
              !statusFilter && styles.statusFilterTextSelected,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.statusFilterOption,
            statusFilter === 'unpaid' && styles.statusFilterSelected,
          ]}
          onPress={() => setStatusFilter('unpaid')}
        >
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'unpaid' && styles.statusFilterTextSelected,
            ]}
          >
            Unpaid
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.statusFilterOption,
            statusFilter === 'paid' && styles.statusFilterSelected,
          ]}
          onPress={() => setStatusFilter('paid')}
        >
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'paid' && styles.statusFilterTextSelected,
            ]}
          >
            Paid
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.statusFilterOption,
            statusFilter === 'overdue' && styles.statusFilterSelected,
          ]}
          onPress={() => setStatusFilter('overdue')}
        >
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'overdue' && styles.statusFilterTextSelected,
            ]}
          >
            Overdue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {vehicles.length > 0 && <VehicleFilter />}
        <StatusFilter />
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={fines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FineItem
              id={item.id}
              amount={item.amount}
              description={item.description}
              issueDate={item.issue_date}
              dueDate={item.due_date || undefined}
              status={item.status}
              licensePlate={item.license_plate || ''}
              onPress={handleFinePress}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            fines.length > 0 ? (
              <View style={styles.headerContainer}>
                <Text style={styles.resultCount}>{fines.length} fine{fines.length !== 1 ? 's' : ''} found</Text>
                <Text style={styles.totalAmount}>
                  Total Unpaid: $
                  {fines
                    .filter(fine => fine.status === 'unpaid' || fine.status === 'overdue')
                    .reduce((sum, fine) => sum + fine.amount, 0)
                    .toFixed(2)}
                </Text>
              </View>
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterSection: {
    padding: 12,
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
  statusFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusFilterOption: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  statusFilterSelected: {
    backgroundColor: '#4F46E5',
  },
  statusFilterText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  statusFilterTextSelected: {
    color: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
}); 