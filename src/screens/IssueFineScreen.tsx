import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';

interface Vehicle {
  id: string;
  license_plate: string;
  model: string;
  make: string;
  color: string;
  owner_id: string | null;
}

interface FineDetails {
  amount: string;
  description: string;
  due_date: Date;
}

export default function IssueFineScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fineDetails, setFineDetails] = useState<FineDetails>({
    amount: '',
    description: '',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });

  const searchVehicle = async () => {
    if (!licensePlate.trim() || !session?.user) return;

    try {
      setLoading(true);
      const formattedLicensePlate = licensePlate.trim().toUpperCase();

      // Try exact match first
      const { data: exactMatch, error: exactError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('license_plate', formattedLicensePlate);

      if (exactError) throw exactError;

      if (exactMatch && exactMatch.length > 0) {
        setVehicle(exactMatch[0]);
        return;
      }

      // If no exact match, try partial match
      const { data: partialMatch, error: partialError } = await supabase
        .from('vehicles')
        .select('*')
        .ilike('license_plate', `%${formattedLicensePlate}%`);

      if (partialError) throw partialError;

      if (partialMatch && partialMatch.length > 0) {
        setVehicle(partialMatch[0]);
        if (partialMatch.length > 1) {
          Alert.alert(
            'Multiple Matches',
            'Multiple vehicles found. Showing the first match.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('No Results', 'No vehicle found with this license plate.');
        setVehicle(null);
      }
    } catch (error: any) {
      console.error('Error searching vehicle:', error.message);
      Alert.alert('Error', 'Failed to search for vehicle');
    } finally {
      setLoading(false);
    }
  };

  const issueFine = async () => {
    if (!vehicle || !session?.user) return;

    if (!fineDetails.amount || !fineDetails.description) {
      Alert.alert('Missing Information', 'Please fill in all fine details');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fines')
        .insert([
          {
            vehicle_id: vehicle.id,
            amount: parseFloat(fineDetails.amount),
            description: fineDetails.description,
            status: 'unpaid',
            created_by: session.user.id,
            issue_date: new Date().toISOString(),
            due_date: fineDetails.due_date.toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Fine has been issued successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setVehicle(null);
              setLicensePlate('');
              setFineDetails({
                amount: '',
                description: '',
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error issuing fine:', error.message);
      Alert.alert('Error', 'Failed to issue fine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Search Vehicle</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter license plate"
            value={licensePlate}
            onChangeText={setLicensePlate}
            autoCapitalize="characters"
            onSubmitEditing={searchVehicle}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchVehicle}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <FontAwesome5 name="search" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {vehicle && (
        <>
          <View style={styles.vehicleSection}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleDetail}>
                <Text style={styles.label}>License Plate:</Text>
                <Text style={styles.value}>{vehicle.license_plate}</Text>
              </View>
              <View style={styles.vehicleDetail}>
                <Text style={styles.label}>Make:</Text>
                <Text style={styles.value}>{vehicle.make || 'N/A'}</Text>
              </View>
              <View style={styles.vehicleDetail}>
                <Text style={styles.label}>Model:</Text>
                <Text style={styles.value}>{vehicle.model || 'N/A'}</Text>
              </View>
              <View style={styles.vehicleDetail}>
                <Text style={styles.label}>Color:</Text>
                <Text style={styles.value}>{vehicle.color || 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.fineSection}>
            <Text style={styles.sectionTitle}>Fine Details</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter fine amount"
                value={fineDetails.amount}
                onChangeText={(text) => setFineDetails({ ...fineDetails, amount: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter fine description"
                value={fineDetails.description}
                onChangeText={(text) => setFineDetails({ ...fineDetails, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={issueFine}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome5 name="check" size={16} color="#FFFFFF" style={styles.submitIcon} />
                  <Text style={styles.submitText}>Issue Fine</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 16,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#374151',
  },
  searchButton: {
    backgroundColor: '#4F46E5',
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  vehicleSection: {
    marginBottom: 24,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleDetail: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    width: 100,
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  fineSection: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 