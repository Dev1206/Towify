import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../src/api/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('owner'); // Default role
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    };
    let isValid = true;
    
    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    console.log('Attempting to sign up with:', { email, role });
    
    try {
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      
      console.log('Signup response:', { userData: data?.user ? 'User exists' : 'No user', error });
      
      if (error) {
        console.error('Signup error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('User created with ID:', data.user.id);
        
        // Create entry in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              email: email,
              role: role,
            },
          ]);
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }
        
        console.log('Profile created successfully');
        
        // Check if email confirmation is required
        if (data?.user?.identities?.length === 0) {
          Alert.alert(
            'User Already Exists',
            'A user with this email already exists.',
            [
              {
                text: 'Go to Login',
                onPress: () => router.replace('/login'),
              },
            ]
          );
        } else {
          // Show a success message with different text based on if email confirmation is required
          const message = data?.user?.confirmed_at 
            ? 'Your account has been created successfully! You can now log in.' 
            : 'Your account has been created! Please check your email to confirm your account before logging in.';
            
          Alert.alert(
            'Registration Successful',
            message,
            [
              {
                text: 'OK',
                onPress: () => router.replace('/login'),
              },
            ]
          );
        }
      } else {
        Alert.alert('Signup Error', 'Failed to create user account');
      }
    } catch (error: any) {
      console.error('Caught signup error:', error);
      Alert.alert('Signup Error', error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  // Role selection component
  const RoleButton = ({ title, isSelected, onPress }: { title: string, isSelected: boolean, onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.roleButton, isSelected && styles.roleButtonSelected]}
      onPress={onPress}
    >
      <Text style={[styles.roleButtonText, isSelected && styles.roleButtonTextSelected]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.logoText}>TOWIFY</Text>
          <Text style={styles.subtitle}>Create an Account</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              style={styles.input}
            />
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              style={styles.input}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              style={styles.input}
            />
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Role</Text>
            <View style={styles.roleContainer}>
              <RoleButton 
                title="Vehicle Owner" 
                isSelected={role === 'owner'} 
                onPress={() => setRole('owner')} 
              />
              <RoleButton 
                title="Tow Staff" 
                isSelected={role === 'staff'} 
                onPress={() => setRole('staff')} 
              />
              <RoleButton 
                title="Officer" 
                isSelected={role === 'officer'} 
                onPress={() => setRole('officer')} 
              />
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4F46E5',
    letterSpacing: 2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
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
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  roleButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  roleButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  roleButtonTextSelected: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#4F46E5',
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  linkText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
}); 