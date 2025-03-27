import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';

interface Vehicle {
  id: string;
  license_plate: string;
  make?: string;
  model: string;
  color: string;
  owner_id: string;
  registered_name?: string;
  owner?: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
  };
}

interface TowRecord {
  id: string;
  location: string;
  reason: string;
  tow_date: string;
  status: string;
  created_at: string;
}

interface FineRecord {
  id: string;
  amount: number;
  description: string;
  issue_date: string;
  due_date: string;
  status: string;
}

export default function VehicleSearchScreen() {
  const router = useRouter();
  const { session } = useSession();
  const params = useLocalSearchParams();
  
  // Get the license plate from params and ensure it's a string
  const queryLicensePlate = params.licensePlate 
    ? typeof params.licensePlate === 'string' 
      ? params.licensePlate 
      : Array.isArray(params.licensePlate) 
        ? params.licensePlate[0] 
        : ''
    : '';
  
  // Search state
  const [licensePlate, setLicensePlate] = useState(queryLicensePlate);
  const [searching, setSearching] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  
  // History state
  const [towHistory, setTowHistory] = useState<TowRecord[]>([]);
  const [fineHistory, setFineHistory] = useState<FineRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'tows' | 'fines'>('details');
  
  // Search for vehicle by license plate
  const searchVehicle = async () => {
    if (!licensePlate || !licensePlate.trim()) {
      Alert.alert('Error', 'Please enter a license plate number');
      return;
    }
    
    try {
      setSearching(true);
      setVehicle(null);
      setVehicleNotFound(false);
      setTowHistory([]);
      setFineHistory([]);
      
      // Format license plate for consistency in search
      const formattedLicensePlate = licensePlate.trim().toUpperCase();
      console.log('DEBUG: Searching for vehicle with license plate:', formattedLicensePlate);
      
      // Try exact match first
      console.log('DEBUG: Trying exact match query');
      let { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, color, owner_id, registered_name')
        .eq('license_plate', formattedLicensePlate);
      
      console.log('DEBUG: Exact match results:', { count: vehicleData?.length, error: vehicleError });
      
      // If no exact match, try with ILIKE
      if (!vehicleData || vehicleData.length === 0) {
        console.log('DEBUG: No exact match found, trying ILIKE query');
        const { data: ilikeData, error: ilikeError } = await supabase
          .from('vehicles')
          .select('id, license_plate, make, model, color, owner_id, registered_name')
          .ilike('license_plate', `%${formattedLicensePlate}%`);
        
        console.log('DEBUG: ILIKE match results:', { count: ilikeData?.length, error: ilikeError });
        
        if (!ilikeError && ilikeData && ilikeData.length > 0) {
          vehicleData = ilikeData;
          vehicleError = null;
        }
      }
      
      console.log('DEBUG: Final vehicle search results:', { 
        count: vehicleData?.length, 
        data: vehicleData,
        userId: session?.user?.id 
      });
      
      // If we can't find in vehicles table, check if it exists in tows table
      if (!vehicleData || vehicleData.length === 0) {
        // Try exact match in tows
        let { data: towData, error: towError } = await supabase
          .from('tows')
          .select('*')
          .eq('license_plate', formattedLicensePlate);
        
        // If no exact match in tows, try with ILIKE
        if (!towData || towData.length === 0) {
          const { data: towIlikeData, error: towIlikeError } = await supabase
            .from('tows')
            .select('*')
            .ilike('license_plate', `%${formattedLicensePlate}%`);
          
          if (!towIlikeError && towIlikeData && towIlikeData.length > 0) {
            towData = towIlikeData;
            towError = null;
          }
        }
        
        console.log('Tow search results:', towData, towError);
        
        if (towData && towData.length > 0) {
          // Create a minimal vehicle object from tow data
          setVehicle({
            id: towData[0].vehicle_id || 'unknown',
            license_plate: towData[0].license_plate,
            model: 'Unknown Model',
            color: 'gray',
            owner_id: ''
          });
          
          // If we have a vehicle_id, try to get more complete data
          if (towData[0].vehicle_id) {
            fetchVehicleHistory(towData[0].vehicle_id);
          } else {
            // Otherwise just show tow data for this license plate
            setTowHistory([towData[0]]);
          }
          
          setSearching(false);
          return;
        }
        
        // If we still can't find it, set not found
        setVehicleNotFound(true);
        setSearching(false);
        return;
      }

      // If we found at least one vehicle
      if (vehicleData && vehicleData.length > 0) {
        const foundVehicle = vehicleData[0];
        
        // If we found a vehicle, fetch owner info separately
        if (foundVehicle.owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone')
            .eq('id', foundVehicle.owner_id)
            .single();
          
          if (!ownerError && ownerData) {
            // Combine vehicle and owner data
            setVehicle({
              ...foundVehicle,
              owner: ownerData
            });
          } else {
            // If we can't get owner data, just use the vehicle
            setVehicle(foundVehicle);
            console.log('Could not fetch owner data:', ownerError?.message);
          }
          
          // Fetch history after finding vehicle
          fetchVehicleHistory(foundVehicle.id);
        } else {
          setVehicle(foundVehicle);
          fetchVehicleHistory(foundVehicle.id);
        }
      } else {
        setVehicleNotFound(true);
      }
    } catch (error: any) {
      console.error('Error searching vehicle:', error.message);
      Alert.alert('Error', 'Failed to search for the vehicle. Please try again.');
      setVehicleNotFound(true);
    } finally {
      setSearching(false);
    }
  };
  
  // Fetch tow and fine history for vehicle
  const fetchVehicleHistory = async (vehicleId: string) => {
    setLoadingHistory(true);
    
    try {
      // Fetch tow history
      const { data: towData, error: towError } = await supabase
        .from('tows')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('tow_date', { ascending: false });
      
      if (towError) throw towError;
      
      // Fetch fine history
      const { data: fineData, error: fineError } = await supabase
        .from('fines')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('issue_date', { ascending: false });
      
      if (fineError) throw fineError;
      
      setTowHistory(towData || []);
      setFineHistory(fineData || []);
    } catch (error: any) {
      console.error('Error fetching vehicle history:', error.message);
      Alert.alert('Error', 'Failed to fetch vehicle history');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Navigate to record tow screen with vehicle pre-selected
  const handleRecordTow = () => {
    if (vehicle) {
      router.push({
        pathname: '/staff/record-tow',
        params: { licensePlate: vehicle.license_plate }
      });
    } else if (licensePlate) {
      router.push({
        pathname: '/staff/record-tow',
        params: { licensePlate: licensePlate }
      });
    }
  };
  
  // Render vehicle details tab
  const renderDetailsTab = () => {
    if (!vehicle) return null;
    
    const unpaidFines = fineHistory.filter(fine => fine.status === 'unpaid').length;
    const totalTows = towHistory.length;
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>License Plate:</Text>
            <Text style={styles.detailValue}>{vehicle.license_plate}</Text>
          </View>
          
          {vehicle.make && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Make:</Text>
              <Text style={styles.detailValue}>{vehicle.make}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model:</Text>
            <Text style={styles.detailValue}>{vehicle.model}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Color:</Text>
            <View style={styles.colorContainer}>
              <View 
                style={[
                  styles.colorDot, 
                  { backgroundColor: vehicle.color === 'white' ? '#F9FAFB' : vehicle.color }
                ]} 
              />
              <Text style={styles.detailValue}>
                {vehicle.color.charAt(0).toUpperCase() + vehicle.color.slice(1)}
              </Text>
            </View>
          </View>
          
          {vehicle.registered_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Registered Name:</Text>
              <Text style={styles.detailValue}>{vehicle.registered_name}</Text>
            </View>
          )}
        </View>
        
        {vehicle.owner && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Owner Information</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{vehicle.owner.full_name}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{vehicle.owner.email}</Text>
            </View>
            
            {vehicle.owner.phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{vehicle.owner.phone}</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, unpaidFines > 0 ? styles.warningCard : {}]}>
              <FontAwesome5 name="dollar-sign" size={18} color={unpaidFines > 0 ? "#EF4444" : "#4F46E5"} />
              <Text style={styles.statValue}>{unpaidFines}</Text>
              <Text style={styles.statLabel}>Unpaid Fines</Text>
            </View>
            
            <View style={styles.statCard}>
              <FontAwesome5 name="truck-pickup" size={18} color="#4F46E5" />
              <Text style={styles.statValue}>{totalTows}</Text>
              <Text style={styles.statLabel}>Total Tows</Text>
            </View>
            
            <View style={styles.statCard}>
              <FontAwesome5 name="calendar-alt" size={18} color="#4F46E5" />
              <Text style={styles.statValue}>
                {towHistory.length > 0 
                  ? new Date(towHistory[0].tow_date).toLocaleDateString() 
                  : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Last Tow</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  // Render tow history tab
  const renderTowsTab = () => {
    if (loadingHistory) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading tow history...</Text>
        </View>
      );
    }
    
    if (towHistory.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="truck-pickup" size={36} color="#D1D5DB" />
          <Text style={styles.emptyText}>No tow records found</Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={towHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <View style={styles.headerLeft}>
                <FontAwesome5 name="truck-pickup" size={16} color="#4F46E5" />
                <Text style={styles.headerText}>
                  {new Date(item.tow_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.statusBadge, 
                {
                  backgroundColor: 
                    item.status === 'completed' ? '#10B981' : 
                    item.status === 'active' ? '#4F46E5' :
                    item.status === 'pending' ? '#F59E0B' : '#6B7280',
                }
              ]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.historyCardBody}>
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyLabel}>Location:</Text>
                <Text style={styles.historyValue}>{item.location}</Text>
              </View>
              
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyLabel}>Reason:</Text>
                <Text style={styles.historyValue}>{item.reason}</Text>
              </View>
              
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyLabel}>Date & Time:</Text>
                <Text style={styles.historyValue}>
                  {new Date(item.tow_date).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    );
  };
  
  // Render fine history tab
  const renderFinesTab = () => {
    if (loadingHistory) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading fine history...</Text>
        </View>
      );
    }
    
    if (fineHistory.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="dollar-sign" size={36} color="#D1D5DB" />
          <Text style={styles.emptyText}>No fine records found</Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={fineHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.historyCard, item.status === 'unpaid' && styles.unpaidCard]}>
            <View style={styles.historyCardHeader}>
              <View style={styles.headerLeft}>
                <FontAwesome5 name="dollar-sign" size={16} color={item.status === 'unpaid' ? "#EF4444" : "#10B981"} />
                <Text style={styles.headerText}>
                  ${item.amount.toFixed(2)}
                </Text>
              </View>
              <View style={[
                styles.statusBadge, 
                {
                  backgroundColor: item.status === 'unpaid' ? '#EF4444' : '#10B981',
                }
              ]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.historyCardBody}>
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyLabel}>Description:</Text>
                <Text style={styles.historyValue}>{item.description}</Text>
              </View>
              
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyLabel}>Issue Date:</Text>
                <Text style={styles.historyValue}>
                  {new Date(item.issue_date).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyLabel}>Due Date:</Text>
                <Text style={styles.historyValue}>
                  {new Date(item.due_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    );
  };
  
  // Render the content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return renderDetailsTab();
      case 'tows':
        return renderTowsTab();
      case 'fines':
        return renderFinesTab();
      default:
        return null;
    }
  };
  
  // Handle not found UI
  const renderNotFound = () => {
    if (!vehicleNotFound) return null;
    
    return (
      <View style={styles.notFoundContainer}>
        <FontAwesome5 name="car" size={48} color="#D1D5DB" />
        <Text style={styles.notFoundTitle}>Vehicle Not Found</Text>
        <Text style={styles.notFoundText}>
          No vehicle with license plate "{licensePlate}" was found in the system.
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleRecordTow}
        >
          <FontAwesome5 name="plus" size={16} color="#FFFFFF" style={styles.actionIcon} />
          <Text style={styles.actionText}>Record Tow for This Plate</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Vehicle Search',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F7F9FC',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchTitle}>
            <FontAwesome5 name="search" size={16} color="#4B5563" /> Search Vehicle
          </Text>
          
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter license plate"
              value={licensePlate}
              onChangeText={setLicensePlate}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchVehicle}
              disabled={searching || !licensePlate.trim()}
            >
              {searching ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Searching for vehicle...</Text>
          </View>
        ) : vehicle ? (
          <View style={styles.resultContainer}>
            <View style={styles.vehicleHeaderContainer}>
              <View style={styles.vehicleIconContainer}>
                <FontAwesome5 name="car" size={24} color="#4F46E5" />
              </View>
              <View style={styles.vehicleHeaderInfo}>
                <Text style={styles.vehiclePlate}>{vehicle.license_plate}</Text>
                <Text style={styles.vehicleModel}>
                  {vehicle.make ? `${vehicle.make} ${vehicle.model}` : vehicle.model}
                </Text>
                {vehicle.registered_name && (
                  <Text style={styles.vehicleRegisteredName}>
                    Registered to: {vehicle.registered_name}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleRecordTow}
              >
                <FontAwesome5 name="truck-pickup" size={16} color="#FFFFFF" style={styles.actionIcon} />
                <Text style={styles.actionText}>Record Tow</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'details' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('details')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'details' && styles.activeTabButtonText
                  ]}
                >
                  Details
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'tows' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('tows')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'tows' && styles.activeTabButtonText
                  ]}
                >
                  Tow History ({towHistory.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'fines' && styles.activeTabButton
                ]}
                onPress={() => setActiveTab('fines')}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'fines' && styles.activeTabButtonText
                  ]}
                >
                  Fines ({fineHistory.length})
                </Text>
              </TouchableOpacity>
            </View>
            
            {loadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : (
              renderTabContent()
            )}
          </View>
        ) : vehicleNotFound ? (
          renderNotFound()
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  vehicleHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleHeaderInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  vehicleModel: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  unpaidCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
    color: '#111827',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  historyCardBody: {
    padding: 12,
  },
  historyDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  historyLabel: {
    width: 100,
    fontSize: 14,
    color: '#6B7280',
  },
  historyValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  vehicleRegisteredName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  resultContainer: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
}); 