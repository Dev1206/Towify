import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function NotificationsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <Text style={styles.text}>Notifications - Coming Soon</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  text: {
    fontSize: 18,
    color: '#4B5563',
  },
}); 