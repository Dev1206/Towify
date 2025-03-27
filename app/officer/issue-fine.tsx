import { Stack } from 'expo-router';
import IssueFineScreen from '../../src/screens/IssueFineScreen';

export default function IssueFine() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Issue Fine',
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
      <IssueFineScreen />
    </>
  );
} 