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

interface TowRequest {
  id: string;
  vehicle_id: string;
  license_plate: string;
  location: string;
  reason: string;
  tow_date: string;
  status: 'pending' | 'active' | 'completed';
  request_status: 'new' | 'accepted' | 'rejected' | 'completed';
  notes?: string;
  created_at: string;
  created_by: string;
  assigned_to?: string;
  vehicle?: {
    license_plate: string;
    model: string;
    make?: string;
    color: string;
    registered_name?: string;
  };
}

type RequestStatusTab = 'new' | 'accepted' | 'rejected' | 'completed' | 'all';

export default function TowRequestsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<RequestStatusTab>('new');
  const [towRequests, setTowRequests] = useState<TowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchTowRequests();
    }
  }, [session, activeTab]);

  const fetchTowRequests = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      let query = supabase
        .from('tows')
        .select(`
          id,
          vehicle_id,
          license_plate,
          location,
          reason,
          tow_date,
          status,
          request_status,
          notes,
          created_at,
          created_by,
          assigned_to,
          vehicles:vehicle_id (license_plate, model, make, color, registered_name)
        `);

      // Filter by request status if not viewing all
      if (activeTab !== 'all') {
        query = query.eq('request_status', activeTab);
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      console.log('Tow requests:', data?.length || 0);
      setTowRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching tow requests:', error.message);
      Alert.alert('Error', 'Failed to load tow requests. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateRequestStatus = async (id: string, newStatus: RequestStatusTab, assignToMe: boolean = false) => {
    if (!session?.user) return;
    
    setUpdating(id);
    
    try {
      const updateData: any = {
        request_status: newStatus,
      };
      
      // Status mappings
      if (newStatus === 'accepted') {
        updateData.status = 'active';
        if (assignToMe) {
          updateData.assigned_to = session.user.id;
        }
      } else if (newStatus === 'completed') {
        updateData.status = 'completed';
      } else if (newStatus === 'rejected') {
        updateData.status = 'cancelled';
      }
      
      const { error } = await supabase
        .from('tows')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Create notification for vehicle owner if request was accepted or completed
      if ((newStatus === 'accepted' || newStatus === 'completed') && session.user.id) {
        const requestToUpdate = towRequests.find(req => req.id === id);
        if (requestToUpdate && requestToUpdate.vehicle_id) {
          // Get vehicle owner from vehicles table
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('owner_id')
            .eq('id', requestToUpdate.vehicle_id)
            .single();
            
          if (!vehicleError && vehicle && vehicle.owner_id) {
            const notificationData = {
              user_id: vehicle.owner_id,
              type: newStatus === 'accepted' ? 'tow_accepted' : 'tow_completed',
              title: newStatus === 'accepted' ? 'Tow Request Accepted' : 'Tow Completed',
              message: newStatus === 'accepted' 
                ? `Your tow request for vehicle ${requestToUpdate.license_plate} has been accepted.`
                : `The tow for your vehicle ${requestToUpdate.license_plate} has been completed.`,
              related_id: id,
              is_read: false,
            };
            
            await supabase.from('notifications').insert(notificationData);
          }
        }
      }
      
      // Refresh the list
      fetchTowRequests();
      Alert.alert('Success', `Tow request has been ${newStatus}.`);
    } catch (error: any) {
      console.error('Error updating tow request:', error.message);
      Alert.alert('Error', 'Failed to update tow request. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleAccept = (id: string) => {
    Alert.alert(
      'Accept Tow Request',
      'Are you sure you want to accept this tow request? It will be assigned to you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => updateRequestStatus(id, 'accepted', true)
        }
      ]
    );
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Reject Tow Request',
      'Are you sure you want to reject this tow request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          onPress: () => updateRequestStatus(id, 'rejected')
        }
      ]
    );
  };

  const handleComplete = (id: string) => {
    Alert.alert(
      'Complete Tow',
      'Are you sure you want to mark this tow as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: () => updateRequestStatus(id, 'completed')
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTowRequests();
  };

  const renderTowRequest = ({ item }: { item: TowRequest }) => {
    const isUpdating = updating === item.id;
    const isNew = item.request_status === 'new';
    const isAccepted = item.request_status === 'accepted';
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.requestIdentifier}>
            <FontAwesome5 name="truck-pickup" size={16} color="#4F46E5" />
            <Text style={styles.licensePlate}>{item.license_plate}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyles(item.request_status).badge]}>
            <Text style={getStatusStyles(item.request_status).text}>
              {item.request_status.charAt(0).toUpperCase() + item.request_status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{item.location}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(item.tow_date), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          
          {item.reason && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reason:</Text>
              <Text style={styles.detailValue}>{item.reason}</Text>
            </View>
          )}
          
          {item.vehicle?.make && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vehicle:</Text>
              <Text style={styles.detailValue}>
                {item.vehicle.make} {item.vehicle.model}, {item.vehicle.color}
              </Text>
            </View>
          )}
          
          {item.vehicle?.registered_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Registered to:</Text>
              <Text style={styles.detailValue}>{item.vehicle.registered_name}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionContainer}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <>
              {isNew && (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(item.id)}
                  >
                    <FontAwesome5 name="check" size={14} color="white" />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(item.id)}
                  >
                    <FontAwesome5 name="times" size={14} color="white" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {isAccepted && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleComplete(item.id)}
                >
                  <FontAwesome5 name="check-double" size={14} color="white" />
                  <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push({
                  pathname: '/staff/tow-details',
                  params: { id: item.id }
                })}
              >
                <FontAwesome5 name="eye" size={14} color="white" />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'new':
        return {
          badge: { backgroundColor: '#FEF3C7' },
          text: { color: '#D97706' }
        };
      case 'accepted':
        return {
          badge: { backgroundColor: '#DBEAFE' },
          text: { color: '#2563EB' }
        };
      case 'rejected':
        return {
          badge: { backgroundColor: '#FEE2E2' },
          text: { color: '#DC2626' }
        };
      case 'completed':
        return {
          badge: { backgroundColor: '#D1FAE5' },
          text: { color: '#059669' }
        };
      default:
        return {
          badge: { backgroundColor: '#E5E7EB' },
          text: { color: '#4B5563' }
        };
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="inbox" size={60} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Tow Requests</Text>
      <Text style={styles.emptyText}>
        There are no tow requests with the selected status.
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tow Requests',
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
        <View style={styles.tabsContainer}>
          {['new', 'accepted', 'completed', 'rejected', 'all'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab as RequestStatusTab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading tow requests...</Text>
          </View>
        ) : (
          <FlatList
            data={towRequests}
            renderItem={renderTowRequest}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
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
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestIdentifier: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licensePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 90,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  acceptButton: {
    backgroundColor: '#059669',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  completeButton: {
    backgroundColor: '#2563EB',
  },
  viewButton: {
    backgroundColor: '#4B5563',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  },
}); 