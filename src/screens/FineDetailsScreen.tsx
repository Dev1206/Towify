import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';
import { format, parseISO, isAfter } from 'date-fns';

interface FineDetails {
  id: string;
  vehicle_id: string;
  amount: number;
  description: string;
  issue_date: string;
  due_date: string | null;
  status: 'unpaid' | 'paid' | 'overdue';
  payment_date: string | null;
  transaction_id: string | null;
  license_plate: string;
  model: string;
  color: string;
  tow_id: string | null;
}

export default function FineDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const [fineDetails, setFineDetails] = useState<FineDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchFineDetails();
  }, [id]);

  const fetchFineDetails = async () => {
    if (!id || !session?.user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fines')
        .select(`
          id,
          vehicle_id,
          amount,
          description,
          issue_date,
          due_date,
          status,
          payment_date,
          transaction_id,
          tow_id,
          vehicles(license_plate, model, color, owner_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      console.log('Fine details data received:', JSON.stringify(data, null, 2));

      // Check if vehicle information exists
      if (!data.vehicles) {
        throw new Error('Vehicle information not found');
      }

      // Handle vehicles data which could be an array or an object
      const vehicleData = Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles;

      // Check if this fine record belongs to the user's vehicle
      if (vehicleData.owner_id !== session.user.id) {
        throw new Error('Unauthorized');
      }

      // Transform data to include vehicle details in the main fine object
      const fineWithVehicleDetails = {
        ...data,
        license_plate: vehicleData.license_plate,
        model: vehicleData.model,
        color: vehicleData.color,
      };

      setFineDetails(fineWithVehicleDetails);
    } catch (error: any) {
      console.error('Error fetching fine details:', error.message);
      
      if (error.message === 'Unauthorized') {
        Alert.alert('Error', 'You are not authorized to view this fine record');
      } else {
        Alert.alert('Error', 'Failed to load fine details');
      }
      
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = () => {
    if (!fineDetails) return;
    
    router.push({
      pathname: '/complaint',
      params: { 
        fine_id: fineDetails.id,
        vehicle_id: fineDetails.vehicle_id,
        type: 'fine'
      }
    });
  };

  const handleViewTow = () => {
    if (!fineDetails || !fineDetails.tow_id) return;
    
    router.push({
      pathname: '/tow-details',
      params: { id: fineDetails.tow_id }
    });
  };

  const handlePayFine = () => {
    if (fineDetails?.status === 'paid') {
      Alert.alert('Already Paid', 'This fine has already been paid.');
      return;
    }
    
    setPaymentModalVisible(true);
  };

  const processPayment = async () => {
    if (!fineDetails || !session?.user) return;
    
    setProcessingPayment(true);
    
    try {
      // Generate a mock transaction ID
      const mockTransactionId = `TX-${Math.floor(Math.random() * 1000000)}-${Date.now()}`;
      
      // Update the fine status in the database
      const { error } = await supabase
        .from('fines')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
          transaction_id: mockTransactionId,
        })
        .eq('id', fineDetails.id)
        .eq('vehicle_id', fineDetails.vehicle_id);
      
      if (error) throw error;
      
      // Update the local state
      setFineDetails({
        ...fineDetails,
        status: 'paid',
        payment_date: new Date().toISOString(),
        transaction_id: mockTransactionId,
      });
      
      // Close the modal
      setPaymentModalVisible(false);
      
      // Show success message
      Alert.alert(
        'Payment Successful',
        `Your payment of $${fineDetails.amount.toFixed(2)} has been processed successfully.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error processing payment:', error.message);
      Alert.alert('Payment Failed', 'Failed to process your payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const PaymentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={paymentModalVisible}
      onRequestClose={() => setPaymentModalVisible(false)}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Confirmation</Text>
            <TouchableOpacity 
              onPress={() => setPaymentModalVisible(false)}
              disabled={processingPayment}
            >
              <FontAwesome5 name="times" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalText}>
              You are about to pay:
            </Text>
            <Text style={styles.modalAmount}>
              ${fineDetails?.amount.toFixed(2)}
            </Text>
            <Text style={styles.modalDescription}>
              Fine for: {fineDetails?.description}
            </Text>
            <Text style={styles.modalVehicle}>
              Vehicle: {fineDetails?.license_plate}
            </Text>
            
            <Text style={styles.modalDisclaimer}>
              This is a mock payment system for demonstration purposes. No actual payment will be processed.
            </Text>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setPaymentModalVisible(false)}
              disabled={processingPayment}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={processPayment}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!fineDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Fine record not found</Text>
      </View>
    );
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'unpaid':
          return '#F59E0B'; // Amber/Yellow
        case 'overdue':
          return '#EF4444'; // Red
        case 'paid':
          return '#10B981'; // Green
        default:
          return '#6B7280'; // Gray
      }
    };

    return (
      <View 
        style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(status) + '20' }
        ]}
      >
        <Text 
          style={[
            styles.statusText, 
            { color: getStatusColor(status) }
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const isPastDue = fineDetails.due_date && 
    isAfter(new Date(), parseISO(fineDetails.due_date)) && 
    fineDetails.status === 'unpaid';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Fine Details',
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
          <FontAwesome5 name="money-bill-wave" size={24} color="#4F46E5" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Fine Details</Text>
          <StatusBadge status={isPastDue ? 'overdue' : fineDetails.status} />
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amount}>${fineDetails.amount.toFixed(2)}</Text>
          {fineDetails.status === 'paid' ? (
            <View style={styles.paidBadge}>
              <FontAwesome5 name="check" size={14} color="white" />
              <Text style={styles.paidText}>PAID</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.payButton}
              onPress={handlePayFine}
            >
              <FontAwesome5 name="credit-card" size={16} color="white" style={styles.payButtonIcon} />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="car" size={16} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>License Plate:</Text>
            <Text style={styles.dataValue}>{fineDetails.license_plate}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Model:</Text>
            <Text style={styles.dataValue}>{fineDetails.model}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Color:</Text>
            <View style={styles.colorContainer}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: fineDetails.color === 'white' ? '#F9FAFB' : fineDetails.color },
                ]}
              />
              <Text style={styles.dataValue}>
                {fineDetails.color.charAt(0).toUpperCase() + fineDetails.color.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome5 name="exclamation-circle" size={16} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Fine Information</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Description:</Text>
            <Text style={styles.dataValue}>{fineDetails.description}</Text>
          </View>
          
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Issue Date:</Text>
            <Text style={styles.dataValue}>
              {format(new Date(fineDetails.issue_date), 'MMM dd, yyyy')}
            </Text>
          </View>
          
          {fineDetails.due_date && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Due Date:</Text>
              <Text style={[
                styles.dataValue,
                isPastDue && styles.overdueText
              ]}>
                {format(new Date(fineDetails.due_date), 'MMM dd, yyyy')}
                {isPastDue && ' (OVERDUE)'}
              </Text>
            </View>
          )}
          
          {fineDetails.payment_date && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Payment Date:</Text>
              <Text style={styles.dataValue}>
                {format(new Date(fineDetails.payment_date), 'MMM dd, yyyy')}
              </Text>
            </View>
          )}
          
          {fineDetails.transaction_id && (
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Transaction:</Text>
              <Text style={styles.dataValue}>
                {fineDetails.transaction_id}
              </Text>
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
          
          {fineDetails.tow_id && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleViewTow}
            >
              <FontAwesome5 name="truck-pickup" size={16} color="#4F46E5" style={styles.actionIcon} />
              <Text style={styles.secondaryButtonText}>View Related Tow</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      
      <PaymentModal />
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
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  payButtonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  paidText: {
    color: 'white',
    fontWeight: '700',
    marginLeft: 6,
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
  overdueText: {
    color: '#EF4444',
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
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
  },
  modalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  modalVehicle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  modalDisclaimer: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalConfirmButton: {
    backgroundColor: '#4F46E5',
  },
  modalButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 