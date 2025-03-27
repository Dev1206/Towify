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
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Vehicle {
  id: string;
  license_plate: string;
  make?: string;
  model: string;
  color: string;
  owner_id: string;
  registered_name?: string;
}

interface TowDetails {
  vehicle_id: string;
  license_plate: string; // For storing directly in tow record
  location: string;
  reason: string;
  tow_date: Date;
  status: 'pending' | 'active' | 'completed';
  notes: string;
}

export default function RecordTowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useSession();
  
  // Form state
  const [licensePlate, setLicensePlate] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [towDate, setTowDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Vehicle details (for creating new vehicle entries)
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  
  // Vehicle search state
  const [searchingVehicle, setSearchingVehicle] = useState(false);
  const [vehicleFound, setVehicleFound] = useState<Vehicle | null>(null);
  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  
  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [issueFineToo, setIssueFineToo] = useState(false);
  const [fineAmount, setFineAmount] = useState('');
  const [fineDescription, setFineDescription] = useState('');
  
  // Get license plate from params if available
  useEffect(() => {
    // Check if we have a license plate from route params
    if (params.licensePlate) {
      const plate = params.licensePlate as string;
      setLicensePlate(plate);
      // Auto-search after a short delay
      const timer = setTimeout(() => {
        searchVehicle();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [params]);
  
  // Clear form
  const resetForm = () => {
    setLicensePlate('');
    setLocation('');
    setReason('');
    setTowDate(new Date());
    setNotes('');
    setVehicleFound(null);
    setVehicleNotFound(false);
    setIssueFineToo(false);
    setFineAmount('');
    setFineDescription('');
    setVehicleMake('');
    setVehicleModel('');
    setVehicleColor('');
    setRegisteredName('');
  };
  
  // Search for vehicle by license plate
  const searchVehicle = async () => {
    if (!licensePlate || !licensePlate.trim()) {
      Alert.alert('Error', 'Please enter a license plate number');
      return;
    }
    
    try {
      setSearchingVehicle(true);
      setVehicleFound(null);
      setVehicleNotFound(false);
      
      // Format license plate for consistency in search
      const formattedLicensePlate = licensePlate.trim().toUpperCase();
      console.log('DEBUG: Searching for vehicle with license plate:', formattedLicensePlate);
      
      // First try exact match
      console.log('DEBUG: Trying exact match with query:', `SELECT * FROM vehicles WHERE license_plate = '${formattedLicensePlate}'`);
      let { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('license_plate', formattedLicensePlate);
      
      console.log('DEBUG: Exact match results:', { data, error });
      
      // If no exact matches, try case-insensitive search
      if ((!data || data.length === 0) && error === null) {
        console.log('DEBUG: No exact match found, trying ILIKE with query:', `SELECT * FROM vehicles WHERE license_plate ILIKE '%${formattedLicensePlate}%'`);
        const { data: ilikeData, error: ilikeError } = await supabase
          .from('vehicles')
          .select('*')
          .ilike('license_plate', `%${formattedLicensePlate}%`);
        
        console.log('DEBUG: ILIKE match results:', { data: ilikeData, error: ilikeError });
        
        if (!ilikeError && ilikeData && ilikeData.length > 0) {
          data = ilikeData;
          error = null;
        }
      }
      
      console.log('DEBUG: Final vehicle search results:', { data, error });
      
      if (error) {
        console.error('DEBUG: Database error when searching vehicle:', error);
        throw error;
      } else if (!data || data.length === 0) {
        console.log('DEBUG: No vehicles found in database matching the license plate');
        // No vehicles found
        setVehicleNotFound(true);
        
        // Pre-fill vehicle color if it's a standard color
        const standardColors = ['black', 'white', 'silver', 'gray', 'red', 'blue', 'green', 'yellow', 'orange', 'brown'];
        const colorMatch = licensePlate.toLowerCase().match(new RegExp(standardColors.join('|')));
        if (colorMatch) {
          setVehicleColor(colorMatch[0]);
        }
      } else if (data.length === 1) {
        console.log('DEBUG: One matching vehicle found:', data[0]);
        // Exactly one vehicle found
        setVehicleFound(data[0]);
        
        // If we found vehicle with make field (updated schema), pre-fill the model field
        if (data[0].make) {
          setVehicleMake(data[0].make);
        }
        setVehicleModel(data[0].model);
        setVehicleColor(data[0].color);
        if (data[0].registered_name) {
          setRegisteredName(data[0].registered_name);
        }
      } else if (data.length > 1) {
        console.log('DEBUG: Multiple matching vehicles found. Using first match:', data[0]);
        // Multiple matches - use the first one but warn user
        setVehicleFound(data[0]);
        setVehicleMake(data[0].make || '');
        setVehicleModel(data[0].model);
        setVehicleColor(data[0].color);
        if (data[0].registered_name) {
          setRegisteredName(data[0].registered_name);
        }
        
        Alert.alert(
          'Multiple Matches',
          `Found ${data.length} vehicles with similar license plates. Using the first match.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('DEBUG: Error searching vehicle:', error.message);
      Alert.alert('Error', 'Failed to search for the vehicle. Please try again.');
    } finally {
      setSearchingVehicle(false);
    }
  };
  
  // Handle date picker change
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTowDate(selectedDate);
    }
  };
  
  // Submit tow record
  const handleSubmitTow = async () => {
    // Validate form
    if (!licensePlate || !licensePlate.trim()) {
      Alert.alert('Error', 'Please enter a license plate number');
      return;
    }
    
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter the tow location');
      return;
    }
    
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for towing');
      return;
    }
    
    if (issueFineToo && (!fineAmount.trim() || isNaN(parseFloat(fineAmount)))) {
      Alert.alert('Error', 'Please enter a valid fine amount');
      return;
    }
    
    if (issueFineToo && !fineDescription.trim()) {
      Alert.alert('Error', 'Please enter a description for the fine');
      return;
    }
    
    setSubmitting(true);
    
    try {
      let vehicleId = vehicleFound?.id;
      
      // If no existing vehicle was found, create a new vehicle record
      if (!vehicleFound) {
        // Collect vehicle information
        const newVehicleData = {
          license_plate: licensePlate.trim().toUpperCase(),
          make: vehicleMake || 'Unknown',
          model: vehicleModel || 'Unknown',
          color: vehicleColor || 'unknown',
          registered_name: registeredName || null,
          owner_id: null, // Owner is unknown at this point
        };
        
        // Insert new vehicle
        const { data: newVehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .insert(newVehicleData)
          .select()
          .single();
        
        if (vehicleError) {
          console.error('Error creating vehicle:', vehicleError.message);
          Alert.alert('Warning', 'Could not create vehicle record. Proceeding with tow record only.');
        } else if (newVehicle) {
          vehicleId = newVehicle.id;
          console.log('Created new vehicle with ID:', vehicleId);
        }
      }
      
      // Prepare tow data
      const towPayload = {
        vehicle_id: vehicleId, // Will be undefined if vehicle creation failed
        license_plate: licensePlate.trim().toUpperCase(),
        location: location.trim(),
        reason: reason.trim(),
        tow_date: towDate.toISOString(),
        status: 'active',
        notes: notes.trim(),
        created_by: session?.user?.id,
      };
      
      // Insert tow record
      const { data: createdTow, error: towError } = await supabase
        .from('tows')
        .insert(towPayload)
        .select()
        .single();
      
      if (towError) throw towError;
      
      // Issue fine if selected
      if (issueFineToo && vehicleId) {
        const fineData = {
          vehicle_id: vehicleId,
          amount: parseFloat(fineAmount),
          description: fineDescription.trim(),
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          status: 'unpaid',
          created_by: session?.user?.id,
          tow_id: createdTow.id, // Link to the tow record
        };
        
        const { error: fineError } = await supabase
          .from('fines')
          .insert(fineData);
        
        if (fineError) throw fineError;
      }
      
      // Create notification for vehicle owner if vehicle exists in the system
      if (vehicleFound && vehicleFound.owner_id) {
        const notificationData = {
          user_id: vehicleFound.owner_id,
          type: 'tow',
          title: 'Vehicle Towed',
          message: `Your vehicle (${licensePlate}) has been towed from ${location}`,
          related_id: createdTow.id,
          is_read: false,
        };
        
        // Insert notification (don't throw if this fails)
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData);
        
        if (notificationError) {
          console.error('Error creating notification:', notificationError.message);
        }
      }
      
      // Success message
      Alert.alert(
        'Success',
        `Tow record created successfully${issueFineToo ? ' with associated fine' : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error recording tow:', error.message);
      Alert.alert('Error', 'Failed to record the tow. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderVehicleInfo = () => {
    if (searchingVehicle) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.loadingText}>Searching for vehicle...</Text>
        </View>
      );
    }
    
    if (vehicleNotFound) {
      return (
        <View style={styles.notFoundContainer}>
          <FontAwesome5 name="exclamation-circle" size={24} color="#F59E0B" />
          <Text style={styles.notFoundText}>
            No vehicle found with this license plate.
          </Text>
          <Text style={styles.notFoundSubtext}>
            Please enter vehicle details below to create a new record.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Make</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vehicle make (e.g. Toyota, Honda)"
              value={vehicleMake}
              onChangeText={setVehicleMake}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Model</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vehicle model (e.g. Camry, Civic)"
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Color</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vehicle color (e.g. black, white, red)"
              value={vehicleColor}
              onChangeText={setVehicleColor}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Registered Name (if known)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter registered owner's name (if known)"
              value={registeredName}
              onChangeText={setRegisteredName}
            />
          </View>
        </View>
      );
    }
    
    if (vehicleFound) {
      return (
        <View style={styles.vehicleInfoCard}>
          <View style={styles.vehicleHeaderRow}>
            <FontAwesome5 name="car" size={16} color="#4F46E5" />
            <Text style={styles.vehicleHeaderText}>Vehicle Found</Text>
          </View>
          
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>License Plate:</Text>
            <Text style={styles.vehicleInfoValue}>{vehicleFound.license_plate}</Text>
          </View>
          
          {vehicleFound.make && (
            <View style={styles.vehicleInfoRow}>
              <Text style={styles.vehicleInfoLabel}>Make:</Text>
              <Text style={styles.vehicleInfoValue}>{vehicleFound.make}</Text>
            </View>
          )}
          
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Model:</Text>
            <Text style={styles.vehicleInfoValue}>{vehicleFound.model}</Text>
          </View>
          
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Color:</Text>
            <View style={styles.colorContainer}>
              <View 
                style={[
                  styles.colorDot, 
                  { backgroundColor: vehicleFound.color === 'white' ? '#F9FAFB' : vehicleFound.color }
                ]} 
              />
              <Text style={styles.vehicleInfoValue}>
                {vehicleFound.color.charAt(0).toUpperCase() + vehicleFound.color.slice(1)}
              </Text>
            </View>
          </View>
          
          {vehicleFound.registered_name && (
            <View style={styles.vehicleInfoRow}>
              <Text style={styles.vehicleInfoLabel}>Registered To:</Text>
              <Text style={styles.vehicleInfoValue}>{vehicleFound.registered_name}</Text>
            </View>
          )}
          
          {vehicleFound.owner_id && (
            <View style={styles.registeredInfo}>
              <FontAwesome5 name="info-circle" size={14} color="#4F46E5" style={styles.infoIcon} />
              <Text style={styles.registeredText}>
                This vehicle is registered in the system.
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    return null;
  };
  
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Record Tow',
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
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <FontAwesome5 name="truck-pickup" size={24} color="#4F46E5" />
            <Text style={styles.headerTitle}>Record New Tow</Text>
          </View>
          
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            
            <View style={styles.searchContainer}>
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
                  disabled={searchingVehicle || !licensePlate.trim()}
                >
                  {searchingVehicle ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.searchButtonText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            {renderVehicleInfo()}
            
            <Text style={styles.sectionTitle}>Tow Details</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter tow location"
                value={location}
                onChangeText={setLocation}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter reason for towing"
                value={reason}
                onChangeText={setReason}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tow Date & Time</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.datePickerButtonText}>
                  {towDate.toLocaleString()}
                </Text>
                <FontAwesome5 name="calendar-alt" size={16} color="#6B7280" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={towDate}
                  mode="datetime"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter additional notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <TouchableOpacity
              style={styles.fineToggleButton}
              onPress={() => setIssueFineToo(!issueFineToo)}
            >
              <View style={[
                styles.checkboxContainer,
                issueFineToo && styles.checkboxContainerSelected
              ]}>
                {issueFineToo && (
                  <FontAwesome5 name="check" size={12} color="white" />
                )}
              </View>
              <Text style={styles.fineToggleText}>
                Issue fine with this tow
              </Text>
            </TouchableOpacity>
            
            {issueFineToo && (
              <View style={styles.fineContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fine Amount ($)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter fine amount"
                    value={fineAmount}
                    onChangeText={setFineAmount}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fine Description</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter fine description"
                    value={fineDescription}
                    onChangeText={setFineDescription}
                  />
                </View>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmitTow}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome5 
                    name="save" 
                    size={16} 
                    color="#FFFFFF" 
                    style={styles.submitIcon} 
                  />
                  <Text style={styles.submitText}>Record Tow</Text>
                </>
              )}
            </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 16,
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
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  notFoundContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 20,
  },
  notFoundText: {
    marginTop: 8,
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  notFoundSubtext: {
    marginTop: 4,
    color: '#92400E',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  vehicleInfoCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  vehicleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vehicleInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  vehicleInfoValue: {
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
  formGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
  },
  datePickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  fineToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxContainerSelected: {
    backgroundColor: '#4F46E5',
  },
  fineToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  fineContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registeredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  registeredText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
}); 