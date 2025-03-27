import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';
import VehicleItem from '../components/VehicleItem';
import { LinearGradient } from 'expo-linear-gradient';

interface Vehicle {
  id: string;
  license_plate: string;
  model: string;
  color: string;
  make: string;
}

export default function VehicleListScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const fetchVehicles = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', session.user.id);

      if (error) {
        throw error;
      }

      setVehicles(data || []);
      setFilteredVehicles(data || []);
      
      // Animate the content in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
    } catch (error: any) {
      console.error('Error fetching vehicles:', error.message);
      Alert.alert('Error', 'Failed to load vehicles. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [session]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = vehicles.filter(vehicle => 
        vehicle.license_plate.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        (vehicle.make && vehicle.make.toLowerCase().includes(query)) ||
        vehicle.color.toLowerCase().includes(query)
      );
      setFilteredVehicles(filtered);
    }
  }, [searchQuery, vehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const handleVehiclePress = (id: string) => {
    router.push({
      pathname: '/vehicle-details',
      params: { id }
    });
  };

  const handleAddVehicle = () => {
    router.push('/add-vehicle');
  };

  const renderEmptyList = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#E6E6FA', '#F0F8FF']}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyIconContainer}>
          <FontAwesome5 name="car" size={40} color="#4F46E5" />
        </View>
        <Text style={styles.emptyTitle}>No Vehicles Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim() !== '' 
            ? `No matches found for "${searchQuery}". Try a different search term.`
            : "You haven't added any vehicles yet. Add your first vehicle to start monitoring."}
        </Text>
        {searchQuery.trim() === '' && (
          <TouchableOpacity 
            style={styles.emptyAddButton} 
            onPress={handleAddVehicle}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="plus" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.addButtonText}>Add New Vehicle</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>My Vehicles</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddVehicle}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="plus" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.addButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by plate, model, or color"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome5 name="times-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading your vehicles...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredVehicles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <VehicleItem
                id={item.id}
                licensePlate={item.license_plate}
                model={item.model}
                color={item.color}
                onPress={handleVehiclePress}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyList}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#4F46E5" 
                colors={['#4F46E5']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#F7F9FC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    height: '100%',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 50,
  },
  emptyGradient: {
    width: '100%',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
}); 