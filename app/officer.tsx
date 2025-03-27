import { Stack } from 'expo-router';
import OfficerDashboardScreen from '../src/screens/OfficerDashboardScreen';

export default function OfficerDashboard() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Officer Dashboard',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#4F46E5',
          },
          headerTitleStyle: {
            color: '#FFFFFF',
            fontWeight: 'bold',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
      <OfficerDashboardScreen />
    </>
  );
} 