import { Stack } from 'expo-router';
import React from 'react';
import ComplaintReviewScreen from '../../src/screens/ComplaintReviewScreen';
import { useSession } from '../../src/context/SessionContext';
import { View, Text, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ComplaintReviewPage() {
  const { session, loading } = useSession();
  const insets = useSafeAreaInsets();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }
  
  if (!session || !session.user) {
    // Redirect is handled by SessionProvider, this is just a fallback
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}>
        <Text>Please log in to access this page</Text>
      </View>
    );
  }
  
  return <ComplaintReviewScreen />;
} 