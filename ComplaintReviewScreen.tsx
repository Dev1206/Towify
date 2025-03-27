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
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
  status: 'pending' | 'in_review' | 'resolved' | 'rejected';
  created_at: string;
  response?: string;
  resolved_at?: string;
  resolved_by?: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  };
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

type ComplaintStatusTab = 'pending' | 'in_review' | 'resolved' | 'rejected' | 'all';

export default function ComplaintReviewScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<ComplaintStatusTab>('pending');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Response modal state
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'in_review' | 'resolved' | 'rejected'>('in_review');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchComplaints();
    }
  }, [session, activeTab]);

  const fetchComplaints = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      // First, fetch all complaints without joining relationships
      let query = supabase
        .from('complaints')
        .select('*');

      // Filter by status if not viewing all
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // If we have complaints, fetch all related data
      if (data && data.length > 0) {
        // 1. Collect IDs for all related data we need to fetch
        const userIds = [...new Set(data.map(c => c.user_id).filter(Boolean))];
        const vehicleIds = [...new Set(data.map(c => c.vehicle_id).filter(Boolean))];
        const towIds = [...new Set(data.map(c => c.tow_id).filter(Boolean))];
        const fineIds = [...new Set(data.map(c => c.fine_id).filter(Boolean))];
        
        // 2. Create empty maps for all related data
        const profilesMap: Record<string, any> = {};
        const vehiclesMap: Record<string, any> = {};
        const towsMap: Record<string, any> = {};
        const finesMap: Record<string, any> = {};
        
        // 3. Fetch profiles if needed
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone')
            .in('id', userIds);
            
          if (profilesData) {
            profilesData.forEach(profile => {
              profilesMap[profile.id] = profile;
            });
          }
        }
        
        // 4. Fetch vehicles if needed
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
        
        // 5. Fetch tows if needed
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
        
        // 6. Fetch fines if needed
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
        
        // 7. Combine all data
        const completeComplaints = data.map(complaint => {
          const completeComplaint = { ...complaint };
          
          if (complaint.user_id && profilesMap[complaint.user_id]) {
            completeComplaint.profiles = profilesMap[complaint.user_id];
          }
          
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
        
        console.log('Fetched complete complaints data:', completeComplaints.length);
        setComplaints(completeComplaints);
      } else {
        setComplaints(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching complaints:', error.message);
      Alert.alert('Error', 'Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateComplaintStatus = async (id: string, newStatus: ComplaintStatusTab, response?: string) => {
    if (!session?.user) return;
    
    setUpdating(id);
    
    try {
      const updateData: any = {
        status: newStatus,
      };
      
      if (response) {
        updateData.response = response;
      }
      
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = session.user.id;
      }
      
      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Create notification for the user who submitted the complaint
      const complaintToUpdate = complaints.find(comp => comp.id === id);
      if (complaintToUpdate && complaintToUpdate.user_id) {
        const notificationData = {
          user_id: complaintToUpdate.user_id,
          type: 'complaint_update',
          title: `Complaint ${newStatus === 'resolved' ? 'Resolved' : 'Updated'}`,
          message: newStatus === 'resolved' 
            ? `Your complaint "${complaintToUpdate.subject}" has been resolved.`
            : `Your complaint "${complaintToUpdate.subject}" has been updated to ${newStatus.replace('_', ' ')}.`,
          related_id: id,
          is_read: false,
        };
        
        await supabase.from('notifications').insert(notificationData);
      }
      
      // Refresh the list
      fetchComplaints();
      
      if (response) {
        Alert.alert('Success', `Response submitted and complaint updated to ${newStatus.replace('_', ' ')}.`);
      } else {
        Alert.alert('Success', `Complaint status updated to ${newStatus.replace('_', ' ')}.`);
      }
    } catch (error: any) {
      console.error('Error updating complaint:', error.message);
      Alert.alert('Error', 'Failed to update complaint. Please try again.');
    } finally {
      setUpdating(null);
      setResponseModalVisible(false);
      setResponseText('');
      setSelectedComplaint(null);
      setSelectedStatus('in_review');
      setSubmittingResponse(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: ComplaintStatusTab) => {
    if (newStatus === 'resolved') {
      Alert.alert(
        'Resolve Complaint',
        'Are you sure you want to mark this complaint as resolved?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Resolve', 
            onPress: () => updateComplaintStatus(id, newStatus)
          }
        ]
      );
    } else {
      updateComplaintStatus(id, newStatus);
    }
  };

  const handleOpenResponseModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setSelectedStatus(complaint.status);
    setResponseText(complaint.response || '');
    setResponseModalVisible(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedComplaint) return;
    
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response before submitting.');
      return;
    }
    
    setSubmittingResponse(true);
    updateComplaintStatus(selectedComplaint.id, selectedStatus, responseText);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
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
    const isUpdating = updating === item.id;
    const isPending = item.status === 'pending';
    const isInReview = item.status === 'in_review';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIdentifier}>
            <FontAwesome5 name={getTypeIcon(item.type)} size={16} color="#4F46E5" />
            <Text style={styles.cardTitle}>{item.subject}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyles(item.status).badge]}>
            <Text style={getStatusStyles(item.status).text}>
              {item.status === 'in_review' ? 'In Review' : 
               item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From:</Text>
            <Text style={styles.detailValue}>
              {item.profiles?.full_name || item.profiles?.email || 'Unknown User'}
            </Text>
          </View>
          
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
            <Text style={styles.responseLabel}>Response:</Text>
            <Text style={styles.responseText} numberOfLines={2}>
              {item.response}
            </Text>
          </View>
        )}
        
        <View style={styles.cardActions}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => handleOpenResponseModal(item)}
              >
                <FontAwesome5 name="reply" size={14} color="white" />
                <Text style={styles.actionButtonText}>Respond</Text>
              </TouchableOpacity>
              
              {isPending && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.inProgressButton]}
                  onPress={() => handleStatusChange(item.id, 'in_review')}
                >
                  <FontAwesome5 name="clock" size={14} color="white" />
                  <Text style={styles.actionButtonText}>Mark In Review</Text>
                </TouchableOpacity>
              )}
              
              {(isPending || isInReview) && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.resolveButton]}
                  onPress={() => handleStatusChange(item.id, 'resolved')}
                >
                  <FontAwesome5 name="check" size={14} color="white" />
                  <Text style={styles.actionButtonText}>Resolve</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="inbox" size={60} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Complaints</Text>
      <Text style={styles.emptyText}>
        There are no complaints with the selected status.
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Complaint Review',
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
          {['pending', 'in_review', 'resolved', 'rejected', 'all'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab as ComplaintStatusTab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText
                ]}
              >
                {tab === 'in_review' 
                  ? 'In Review' 
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
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
          />
        )}
      </View>
      
      {/* Response Modal */}
      <Modal
        visible={responseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setResponseModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setResponseModalVisible(false)}
              >
                <FontAwesome5 name="times" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Respond to Complaint</Text>
            </View>
            
            {selectedComplaint && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.complaintSummary}>
                  <Text style={styles.summaryTitle}>{selectedComplaint.subject}</Text>
                  <View style={styles.summaryMeta}>
                    <Text style={styles.summaryMetaText}>
                      From: {selectedComplaint.profiles?.full_name || selectedComplaint.profiles?.email || 'Unknown User'}
                    </Text>
                    <Text style={styles.summaryMetaText}>
                      {format(new Date(selectedComplaint.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={styles.summaryDescription}>{selectedComplaint.description}</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Update Status</Text>
                  <View style={styles.statusOptions}>
                    {['pending', 'in_review', 'resolved', 'rejected'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          selectedStatus === status && styles.selectedStatusOption
                        ]}
                        onPress={() => setSelectedStatus(status as 'pending' | 'in_review' | 'resolved' | 'rejected')}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            selectedStatus === status && styles.selectedStatusOptionText
                          ]}
                        >
                          {status === 'in_review' 
                            ? 'In Review' 
                            : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Your Response</Text>
                  <TextInput
                    style={styles.responseInput}
                    value={responseText}
                    onChangeText={setResponseText}
                    placeholder="Enter your response to this complaint..."
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitResponse}
                  disabled={submittingResponse}
                >
                  {submittingResponse ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Response</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  viewButton: {
    backgroundColor: '#4F46E5',
  },
  inProgressButton: {
    backgroundColor: '#2563EB',
  },
  resolveButton: {
    backgroundColor: '#059669',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // To center the title with the close button on the left
  },
  modalBody: {
    padding: 16,
  },
  complaintSummary: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  summaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedStatusOption: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  selectedStatusOptionText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  responseInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    height: 120,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 