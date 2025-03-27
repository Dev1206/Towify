import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../src/api/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = () => {
    let isValid = true;
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Email is invalid');
      isValid = false;
    } else {
      setEmailError('');
    }
    
    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    console.log('Attempting to log in with:', { email });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Login response:', { data, error });
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      
      if (data?.user) {
        console.log('Login successful, user:', data.user);
        
        // Fetch user role directly here to ensure it's set
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          Alert.alert('Profile Error', 'Could not fetch user profile');
        } else {
          console.log('User role:', profileData?.role);
          
          // Manually navigate based on role
          const role = profileData?.role;
          if (role) {
            switch (role.toLowerCase()) {
              case 'owner':
                router.replace('/owner');
                break;
              case 'staff':
                router.replace('/staff');
                break;
              case 'officer':
                router.replace('/officer');
                break;
              default:
                Alert.alert('Role Error', `Unknown role: ${role}`);
            }
          } else {
            Alert.alert('Role Error', 'No role assigned to user');
          }
        }
      } else {
        Alert.alert('Login Error', 'No user data returned');
      }
    } catch (error: any) {
      console.error('Caught login error:', error);
      Alert.alert('Login Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.formContainer}>
        <Text style={styles.logoText}>TOWIFY</Text>
        <Text style={styles.subtitle}>Vehicle Towing Management</Text>
        
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
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
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
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
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
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
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
  button: {
    backgroundColor: '#4F46E5',
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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