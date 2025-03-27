import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';

interface Vehicle {
  id: string;
  license_plate: string;
  model: string;
}

export default function ComplaintScreen() {
  const { session } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [complaintType, setComplaintType] = useState(params.type as string || 'general');
  const [vehicleId, setVehicleId] = useState<string | null>(params.vehicle_id as string || null);
  const [fineId, setFineId] = useState<string | null>(params.fine_id as string || null);
  const [towId, setTowId] = useState<string | null>(params.tow_id as string || null);
  
  // Loading states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Steps tracking
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  useEffect(() => {
    if (session?.user) {
      fetchUserVehicles();
      
      // If coming from a specific context, pre-fill the subject line
      if (fineId) {
        setSubject('Complaint about Fine');
        setCurrentStep(2);
      } else if (towId) {
        setSubject('Complaint about Tow');
        setCurrentStep(2);
      }
    }
  }, [session]);
  
  const fetchUserVehicles = async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, model')
        .eq('owner_id', session.user.id);
        
      if (error) throw error;
      
      setVehicles(data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error.message);
      Alert.alert('Error', 'Failed to load your vehicles');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    // Validation
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject for your complaint');
      return;
    }
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide details about your complaint');
      return;
    }
    
    if (complaintType !== 'general' && !vehicleId) {
      Alert.alert('Error', 'Please select a vehicle for your complaint');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Create the complaint record
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          user_id: session?.user?.id,
          subject,
          description,
          type: complaintType,
          vehicle_id: vehicleId,
          fine_id: fineId,
          tow_id: towId,
          status: 'pending',
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Show success message
      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted successfully. Our team will review it soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back or to a confirmation screen
              if (fineId) {
                router.back();
              } else if (towId) {
                router.back();
              } else {
                router.replace('/owner');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting complaint:', error.message);
      Alert.alert('Error', 'Failed to submit your complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderVehicleSelector = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      );
    }
    
    // Show message if no vehicles available
    if (vehicles.length === 0) {
      return (
        <View style={styles.noVehiclesContainer}>
          <Text style={styles.noVehiclesText}>
            No vehicles found. Please add a vehicle first.
          </Text>
          <TouchableOpacity 
            style={styles.addVehicleButton}
            onPress={() => router.push('/add-vehicle')}
          >
            <Text style={styles.addVehicleButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // For iOS, we use a button that opens the picker inside a modal which is the default behavior
    // For Android, we render the dropdown directly
    if (Platform.OS === 'ios') {
      const selectedVehicle = vehicles.find(v => v.id === vehicleId);
      const displayText = selectedVehicle 
        ? `${selectedVehicle.license_plate} (${selectedVehicle.model})` 
        : '-- Select a vehicle --';
        
      return (
        <View style={styles.pickerContainerIOS}>
          <TouchableOpacity 
            style={styles.pickerButtonIOS}
            disabled={!!fineId || !!towId}
          >
            <Text style={[
              styles.pickerTextIOS, 
              !selectedVehicle && styles.pickerPlaceholderIOS
            ]}>
              {displayText}
            </Text>
            <FontAwesome5 name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>
          <Picker
            selectedValue={vehicleId || ''}
            onValueChange={(itemValue) => {
              console.log('Vehicle selected:', itemValue);
              setVehicleId(itemValue ? itemValue.toString() : null);
            }}
            style={[styles.picker, {opacity: 0, position: 'absolute', top: 0, width: '100%', height: '100%'}]}
            enabled={!fineId && !towId}
          >
            <Picker.Item label="-- Select a vehicle --" value="" />
            {vehicles.map((vehicle) => (
              <Picker.Item
                key={vehicle.id}
                label={`${vehicle.license_plate} (${vehicle.model})`}
                value={vehicle.id}
              />
            ))}
          </Picker>
        </View>
      );
    }
    
    // Android picker
    return (
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={vehicleId || ''}
          onValueChange={(itemValue) => {
            console.log('Vehicle selected:', itemValue);
            setVehicleId(itemValue ? itemValue.toString() : null);
          }}
          style={styles.picker}
          enabled={!fineId && !towId}
          mode="dropdown"
          dropdownIconColor="#4F46E5"
        >
          <Picker.Item label="-- Select a vehicle --" value="" />
          {vehicles.map((vehicle) => (
            <Picker.Item
              key={vehicle.id}
              label={`${vehicle.license_plate} (${vehicle.model})`}
              value={vehicle.id}
              color="#111827"
            />
          ))}
        </Picker>
      </View>
    );
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (complaintType !== 'general' && !vehicleId) {
        Alert.alert('Error', 'Please select a vehicle for your complaint');
        return;
      }
    } else if (currentStep === 2) {
      if (!subject.trim()) {
        Alert.alert('Error', 'Please enter a subject for your complaint');
        return;
      }
    }
    setCurrentStep(prevStep => Math.min(prevStep + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep(prevStep => Math.max(prevStep - 1, 1));
  };

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View key={index} style={styles.stepRow}>
          <View 
            style={[
              styles.stepCircle, 
              currentStep > index && styles.stepCircleActive,
              currentStep === index + 1 && styles.stepCircleCurrent
            ]}
          >
            {currentStep > index + 1 ? (
              <FontAwesome5 name="check" size={12} color="white" />
            ) : (
              <Text style={styles.stepNumber}>{index + 1}</Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View style={[styles.stepLine, currentStep > index + 1 && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Complaint Type";
      case 2:
        return "Complaint Details";
      case 3:
        return "Confirm & Submit";
      default:
        return "";
    }
  };

  const getComplaintTypeIcon = (type: string) => {
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

  const renderTypeSelector = () => (
    <View style={styles.typeContainer}>
      {['general', 'vehicle', 'fine', 'tow'].map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.typeCard,
            complaintType === type && styles.typeCardSelected,
          ]}
          onPress={() => {
            setComplaintType(type);
            if (type === 'general') {
              setVehicleId(null);
            }
          }}
          disabled={!!fineId || !!towId}
        >
          <View style={[styles.typeIconContainer, complaintType === type && styles.typeIconContainerSelected]}>
            <FontAwesome5 
              name={getComplaintTypeIcon(type)} 
              size={24} 
              color={complaintType === type ? 'white' : '#4F46E5'} 
            />
          </View>
          <Text style={[styles.typeText, complaintType === type && styles.typeTextSelected]}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepInstructions}>
        Please select the type of complaint you'd like to submit.
      </Text>
      
      {renderTypeSelector()}
      
      {complaintType !== 'general' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Vehicle</Text>
          {renderVehicleSelector()}
          <Text style={styles.helperText}>
            This complaint will be associated with the selected vehicle
          </Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.buttonText}>Next</Text>
          <FontAwesome5 name="arrow-right" size={16} color="white" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepInstructions}>
        Please provide details about your complaint.
      </Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Enter the subject of your complaint"
          maxLength={100}
        />
        <Text style={styles.charCount}>{subject.length}/100</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Please provide details about your complaint"
          multiline
          numberOfLines={6}
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <FontAwesome5 name="arrow-left" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.buttonText}>Next</Text>
          <FontAwesome5 name="arrow-right" size={16} color="white" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepInstructions}>
        Please review your complaint details before submitting.
      </Text>
      
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <View style={styles.summaryValue}>
            <FontAwesome5 
              name={getComplaintTypeIcon(complaintType)} 
              size={16} 
              color="#4F46E5" 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.summaryText}>
              {complaintType.charAt(0).toUpperCase() + complaintType.slice(1)} Complaint
            </Text>
          </View>
        </View>
        
        {vehicleId && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vehicle:</Text>
            <Text style={styles.summaryText}>
              {vehicles.find(v => v.id === vehicleId)?.license_plate || 'Unknown'}
            </Text>
          </View>
        )}
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subject:</Text>
          <Text style={styles.summaryText}>{subject}</Text>
        </View>
        
        <View style={[styles.summaryRow, styles.summaryDescriptionRow]}>
          <Text style={styles.summaryLabel}>Description:</Text>
          <Text style={styles.summaryText}>{description}</Text>
        </View>
      </View>
      
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <FontAwesome5 name="info-circle" size={16} color="#4F46E5" />
          <Text style={styles.infoTitle}>What happens next?</Text>
        </View>
        <Text style={styles.infoText}>
          Your complaint will be reviewed by our team within 48 hours. You'll receive a notification once we start processing your complaint.
        </Text>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <FontAwesome5 name="arrow-left" size={16} color="#4F46E5" style={{ marginRight: 8 }} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome5 name="paper-plane" size={16} color="#FFFFFF" style={styles.submitIcon} />
              <Text style={styles.submitText}>Submit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Submit Complaint',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F7F9FC',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <FontAwesome5 name="comment-alt" size={24} color="#4F46E5" />
            <Text style={styles.headerTitle}>Submit a Complaint</Text>
          </View>

          {renderStepIndicator()}
          
          <View style={styles.formCard}>
            <Text style={styles.stepTitle}>{renderStepTitle()}</Text>
            
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 10,
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepCircleActive: {
    backgroundColor: '#4F46E5',
  },
  stepCircleCurrent: {
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  stepNumber: {
    color: '#6B7280',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepLine: {
    height: 2,
    width: 40,
    backgroundColor: '#E5E7EB',
  },
  stepLineActive: {
    backgroundColor: '#4F46E5',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepContent: {
    marginTop: 8,
  },
  stepInstructions: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  typeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconContainerSelected: {
    backgroundColor: '#4F46E5',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeTextSelected: {
    color: '#4F46E5',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  nextButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    maxWidth: 160,
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    maxWidth: 160,
  },
  backButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#111827',
  },
  pickerItem: {
    fontSize: 16,
    color: '#111827',
  },
  loadingContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    maxWidth: 160,
  },
  disabledButton: {
    backgroundColor: '#A5B4FC',
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  summaryDescriptionRow: {
    flexDirection: 'column',
  },
  summaryLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  noVehiclesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noVehiclesText: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 20,
  },
  addVehicleButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addVehicleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainerIOS: {
    position: 'relative',
  },
  pickerButtonIOS: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerTextIOS: {
    fontSize: 16,
    color: '#111827',
  },
  pickerPlaceholderIOS: {
    color: '#6B7280',
  },
}); 