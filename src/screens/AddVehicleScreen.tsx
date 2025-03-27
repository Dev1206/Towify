import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';

const COLORS = [
  { label: 'Black', value: 'black' },
  { label: 'White', value: 'white' },
  { label: 'Silver', value: 'silver' },
  { label: 'Gray', value: 'gray' },
  { label: 'Red', value: 'red' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Orange', value: 'orange' },
  { label: 'Brown', value: 'brown' },
];

export default function AddVehicleScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    licensePlate: '',
    make: '',
    model: '',
    color: '',
  });

  const validateForm = () => {
    const newErrors = {
      licensePlate: '',
      make: '',
      model: '',
      color: '',
    };
    let isValid = true;

    if (!licensePlate.trim()) {
      newErrors.licensePlate = 'License plate is required';
      isValid = false;
    }

    if (!make.trim()) {
      newErrors.make = 'Vehicle make is required';
      isValid = false;
    }

    if (!model.trim()) {
      newErrors.model = 'Vehicle model is required';
      isValid = false;
    }

    if (!selectedColor) {
      newErrors.color = 'Please select a color';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddVehicle = async () => {
    if (!validateForm()) return;
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to add a vehicle');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.from('vehicles').insert([
        {
          owner_id: session.user.id,
          license_plate: licensePlate.toUpperCase(),
          make,
          model,
          color: selectedColor,
          registered_name: registeredName.trim() || null,
        },
      ]).select();

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Vehicle added successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      Alert.alert(
        'Error',
        error.code === '23505'
          ? 'A vehicle with this license plate already exists'
          : 'Failed to add vehicle. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const ColorSelection = () => (
    <View style={styles.colorSelectionContainer}>
      {COLORS.map((color) => (
        <TouchableOpacity
          key={color.value}
          style={[
            styles.colorOption,
            { backgroundColor: color.value === 'white' ? '#F9FAFB' : color.value },
            selectedColor === color.value && styles.colorOptionSelected,
          ]}
          onPress={() => setSelectedColor(color.value)}
        >
          {selectedColor === color.value && (
            <FontAwesome5
              name="check"
              size={14}
              color={['white', 'yellow'].includes(color.value) ? 'black' : 'white'}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Vehicle',
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>License Plate</Text>
              <TextInput
                value={licensePlate}
                onChangeText={(text) => setLicensePlate(text.toUpperCase())}
                placeholder="Enter license plate number"
                style={styles.input}
                autoCapitalize="characters"
              />
              {errors.licensePlate ? (
                <Text style={styles.errorText}>{errors.licensePlate}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Vehicle Make</Text>
              <TextInput
                value={make}
                onChangeText={setMake}
                placeholder="Enter vehicle make (e.g. Toyota)"
                style={styles.input}
              />
              {errors.make ? (
                <Text style={styles.errorText}>{errors.make}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Vehicle Model</Text>
              <TextInput
                value={model}
                onChangeText={setModel}
                placeholder="Enter vehicle model (e.g. Camry)"
                style={styles.input}
              />
              {errors.model ? (
                <Text style={styles.errorText}>{errors.model}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Registered Name</Text>
              <TextInput
                value={registeredName}
                onChangeText={setRegisteredName}
                placeholder="Enter registered owner's name"
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Color</Text>
              <ColorSelection />
              {errors.color ? (
                <Text style={styles.errorText}>{errors.color}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleAddVehicle}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Add Vehicle</Text>
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
  scrollContainer: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  colorSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 