import React, { useEffect } from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../context/SessionContext';
import { navigateToDashboard } from '../utils/navigation';

export default function SplashScreen() {
  const { session, loading, userRole } = useSession();

  useEffect(() => {
    console.log('SplashScreen mounted, session state:', { 
      hasSession: !!session, 
      loading, 
      userRole 
    });

    // When loading is finished, check if user is authenticated
    if (!loading) {
      console.log('Loading finished, navigating based on auth state');
      
      // Short delay to show the splash screen
      const timer = setTimeout(() => {
        if (session) {
          // User is logged in, navigate to the appropriate dashboard
          console.log('User is authenticated, navigating to dashboard with role:', userRole);
          navigateToDashboard(userRole);
        } else {
          // User is not logged in, navigate to login screen
          console.log('No user session, navigating to login');
          router.replace({ pathname: "/login" });
        }
      }, 2000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [loading, session, userRole]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Replace this with your actual logo */}
        <Text style={styles.logoText}>TOWIFY</Text>
      </View>
      <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4F46E5',
    letterSpacing: 2,
  },
  loader: {
    marginTop: 20,
  },
}); 