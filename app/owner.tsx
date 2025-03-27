import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSession } from '../src/context/SessionContext';
import { supabase } from '../src/api/supabase';

interface DashboardStats {
  vehicleCount: number;
  activeFines: number;
  towCount: number;
}

interface DashboardCardProps {
  title: string;
  icon: string;
  value: number;
  onPress: () => void;
  color: string;
}

interface MenuOptionProps {
  title: string;
  icon: string;
  onPress: () => void;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { signOut, session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    vehicleCount: 0,
    activeFines: 0,
    towCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardStats();
    }
  }, [session]);

  const fetchDashboardStats = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      
      // Fetch vehicle count
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact' })
        .eq('owner_id', session.user.id);

      if (vehicleError) throw vehicleError;

      // Just placeholder stats for now - these tables don't exist yet
      // Will be implemented when we create these features

      setStats({
        vehicleCount: vehicles?.length || 0,
        activeFines: 0, // Will be implemented later
        towCount: 0, // Will be implemented later
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToVehicles = () => {
    router.push({ pathname: '/vehicles' });
  };

  const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon, value, onPress, color }) => (
    <TouchableOpacity style={styles.dashboardCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <FontAwesome5 name={icon} size={20} color="white" />
      </View>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const MenuOption: React.FC<MenuOptionProps> = ({ title, icon, onPress }) => (
    <TouchableOpacity style={styles.menuOption} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <FontAwesome5 name={icon} size={18} color="#4F46E5" />
      </View>
      <Text style={styles.menuTitle}>{title}</Text>
      <FontAwesome5 name="chevron-right" size={14} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.title}>Vehicle Owner</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <DashboardCard
            title="Vehicles"
            icon="car"
            value={stats.vehicleCount}
            onPress={navigateToVehicles}
            color="#4F46E5"
          />
          <DashboardCard
            title="Active Fines"
            icon="money-bill-wave"
            value={stats.activeFines}
            onPress={() => router.push({ pathname: '/fine-history' })}
            color="#EF4444"
          />
          <DashboardCard
            title="Tow History"
            icon="history"
            value={stats.towCount}
            onPress={() => router.push({ pathname: '/tow-history' })}
            color="#F59E0B"
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Access</Text>

        <View style={styles.menuContainer}>
          <MenuOption
            title="My Vehicles"
            icon="car"
            onPress={navigateToVehicles}
          />
          <MenuOption
            title="Fine History"
            icon="money-bill-wave"
            onPress={() => router.push({ pathname: '/fine-history' })}
          />
          <MenuOption
            title="Tow History"
            icon="truck-pickup"
            onPress={() => router.push({ pathname: '/tow-history' })}
          />
          <MenuOption
            title="Notifications"
            icon="bell"
            onPress={() => router.push({ pathname: '/notifications' })}
          />
          <MenuOption
            title="Submit Complaint"
            icon="comment-alt"
            onPress={() => router.push({ pathname: '/complaint' })}
          />
          <MenuOption
            title="My Complaints"
            icon="clipboard-list"
            onPress={() => router.push({ pathname: '/my-complaints' })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
}); 