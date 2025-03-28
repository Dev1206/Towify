import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';
import { format } from 'date-fns';

interface Complaint {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  type: 'general' | 'vehicle' | 'fine' | 'tow';
  vehicle_id: string | null;
  fine_id: string | null;
  tow_id: string | null;
  status: 'pending' | 'in_review' | 'in-progress' | 'resolved' | 'rejected';
  created_at: string;
  response?: string;
  resolved_at?: string;
  resolved_by?: string;
  vehicles?: {
    id: string;
    license_plate: string;
    model: string;
    color: string;
  };
  tows?: {
    id: string;
    location: string;
    tow_date: string;
  };
  fines?: {
    id: string;
    amount: number;
    description: string;
    issue_date: string;
  };
}

export default function MyComplaintsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchComplaints();
    }
  }, [session]);

  const fetchComplaints = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      // Fetch all complaints for the current user
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If we have complaints, fetch all related data
      if (data && data.length > 0) {
        // Collect IDs for all related data we need to fetch
        const vehicleIds = [...new Set(data.map(c => c.vehicle_id).filter(Boolean))];
        const towIds = [...new Set(data.map(c => c.tow_id).filter(Boolean))];
        const fineIds = [...new Set(data.map(c => c.fine_id).filter(Boolean))];
        
        // Create empty maps for all related data
        const vehiclesMap: Record<string, any> = {};
        const towsMap: Record<string, any> = {};
        const finesMap: Record<string, any> = {};
        
        // Fetch vehicles if needed
        if (vehicleIds.length > 0) {
          const { data: vehiclesData } = await supabase
            .from('vehicles')
            .select('id, license_plate, model, color')
            .in('id', vehicleIds);
            
          if (vehiclesData) {
            vehiclesData.forEach(vehicle => {
              vehiclesMap[vehicle.id] = vehicle;
            });
          }
        }
        
        // Fetch tows if needed
        if (towIds.length > 0) {
          const { data: towsData } = await supabase
            .from('tows')
            .select('id, location, tow_date')
            .in('id', towIds);
            
          if (towsData) {
            towsData.forEach(tow => {
              towsMap[tow.id] = tow;
            });
          }
        }
        
        // Fetch fines if needed
        if (fineIds.length > 0) {
          const { data: finesData } = await supabase
            .from('fines')
            .select('id, amount, description, issue_date')
            .in('id', fineIds);
            
          if (finesData) {
            finesData.forEach(fine => {
              finesMap[fine.id] = fine;
            });
          }
        }
        
        // Combine all data
        const completeComplaints = data.map(complaint => {
          const completeComplaint = { ...complaint };
          
          if (complaint.vehicle_id && vehiclesMap[complaint.vehicle_id]) {
            completeComplaint.vehicles = vehiclesMap[complaint.vehicle_id];
          }
          
          if (complaint.tow_id && towsMap[complaint.tow_id]) {
            completeComplaint.tows = towsMap[complaint.tow_id];
          }
          
          if (complaint.fine_id && finesMap[complaint.fine_id]) {
            completeComplaint.fines = finesMap[complaint.fine_id];
          }
          
          return completeComplaint;
        });
        
        setComplaints(completeComplaints);
      } else {
        setComplaints([]);
      }
    } catch (error: any) {
      console.error('Error fetching complaints:', error.message);
      Alert.alert('Error', 'Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const handleNewComplaint = () => {
    router.push('/complaint');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general':
        return 'comment-alt';
      case 'vehicle':
        return 'car';
      case 'fine':
        return 'money-bill-wave';
      case 'tow':
        return 'truck-pickup';
      default:
        return 'question-circle';
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          badge: { backgroundColor: '#FEF3C7' },
          text: { color: '#D97706' }
        };
      case 'in_review':
        return {
          badge: { backgroundColor: '#E0F2FE' },
          text: { color: '#0369A1' }
        };
      case 'in-progress':
        return {
          badge: { backgroundColor: '#DBEAFE' },
          text: { color: '#2563EB' }
        };
      case 'resolved':
        return {
          badge: { backgroundColor: '#D1FAE5' },
          text: { color: '#059669' }
        };
      case 'rejected':
        return {
          badge: { backgroundColor: '#FEE2E2' },
          text: { color: '#DC2626' }
        };
      default:
        return {
          badge: { backgroundColor: '#E5E7EB' },
          text: { color: '#4B5563' }
        };
    }
  };

  const renderComplaint = ({ item }: { item: Complaint }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIdentifier}>
            <FontAwesome5 name={getTypeIcon(item.type)} size={16} color="#4F46E5" />
            <Text style={styles.cardTitle}>{item.subject}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyles(item.status).badge]}>
            <Text style={getStatusStyles(item.status).text}>
              {item.status === 'in-progress' ? 'In Progress' : 
               item.status === 'in_review' ? 'In Review' : 
               item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          
          {item.vehicles && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vehicle:</Text>
              <Text style={styles.detailValue}>
                {item.vehicles.license_plate} ({item.vehicles.model}, {item.vehicles.color})
              </Text>
            </View>
          )}
          
          {item.tows && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tow:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(item.tows.tow_date), 'MMM d, yyyy')} at {item.tows.location}
              </Text>
            </View>
          )}
          
          {item.fines && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fine:</Text>
              <Text style={styles.detailValue}>
                ${item.fines.amount} - {item.fines.description}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText} numberOfLines={3}>
            {item.description}
          </Text>
        </View>
        
        {item.response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Staff Response:</Text>
            <Text style={styles.responseText}>
              {item.response}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="inbox" size={60} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Complaints</Text>
      <Text style={styles.emptyText}>
        You haven't submitted any complaints yet.
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={handleNewComplaint}
      >
        <Text style={styles.emptyButtonText}>Submit a Complaint</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Complaints',
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
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading complaints...</Text>
          </View>
        ) : (
          <FlatList
            data={complaints}
            renderItem={renderComplaint}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4F46E5']}
              />
            }
            ListHeaderComponent={() => (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.newComplaintButton}
                  onPress={handleNewComplaint}
                >
                  <FontAwesome5 name="plus" size={14} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>New Complaint</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  newComplaintButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIdentifier: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  descriptionContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  responseContainer: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#4B5563',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 