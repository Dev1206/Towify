import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';

interface DashboardStats {
  pendingTows: number;
  activeTows: number;
  completedTowsToday: number;
  pendingComplaints: number;
  unpaidFines: number;
  totalVehicles: number;
}

interface RecentActivity {
  id: string;
  type: 'tow' | 'complaint' | 'fine';
  title: string;
  time: string;
  status: string;
  created_at: string;
}

interface DashboardCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  onPress?: () => void;
  isLoading?: boolean;
}

interface ActionButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}

export default function StaffDashboardScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendingTows: 0,
    activeTows: 0,
    completedTowsToday: 0,
    pendingComplaints: 0,
    unpaidFines: 0,
    totalVehicles: 0,
  });

  useEffect(() => {
    if (session?.user) {
      fetchDashboardStats();
      fetchRecentActivity();
    }
  }, [session]);

  const fetchDashboardStats = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      // Fetch pending tows
      const { data: pendingTows, error: pendingTowsError } = await supabase
        .from('tows')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      if (pendingTowsError) throw pendingTowsError;

      // Fetch active tows
      const { data: activeTows, error: activeTowsError } = await supabase
        .from('tows')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      if (activeTowsError) throw activeTowsError;

      // Fetch completed tows for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: completedTowsToday, error: completedTowsTodayError } = await supabase
        .from('tows')
        .select('id', { count: 'exact' })
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      if (completedTowsTodayError) throw completedTowsTodayError;

      // Fetch pending complaints
      const { data: pendingComplaints, error: pendingComplaintsError } = await supabase
        .from('complaints')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      if (pendingComplaintsError) throw pendingComplaintsError;

      // Fetch unpaid fines
      const { data: unpaidFines, error: unpaidFinesError } = await supabase
        .from('fines')
        .select('id', { count: 'exact' })
        .eq('status', 'unpaid');

      if (unpaidFinesError) throw unpaidFinesError;

      // Fetch total vehicles
      const { data: totalVehicles, error: totalVehiclesError } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact' });

      if (totalVehiclesError) throw totalVehiclesError;

      // Update the stats
      setStats({
        pendingTows: pendingTows?.length || 0,
        activeTows: activeTows?.length || 0,
        completedTowsToday: completedTowsToday?.length || 0,
        pendingComplaints: pendingComplaints?.length || 0,
        unpaidFines: unpaidFines?.length || 0,
        totalVehicles: totalVehicles?.length || 0,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error.message);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRecentActivity = async () => {
    if (!session?.user) return;

    try {
      setActivityLoading(true);
      
      // Fetch recent tows (last 5)
      const { data: tows, error: towsError } = await supabase
        .from('tows')
        .select('id, created_at, location, status')
        .order('created_at', { ascending: false })
        .limit(3);

      if (towsError) throw towsError;

      // Fetch recent complaints (last 5)
      const { data: complaints, error: complaintsError } = await supabase
        .from('complaints')
        .select('id, created_at, subject, status')
        .order('created_at', { ascending: false })
        .limit(3);

      if (complaintsError) throw complaintsError;

      // Fetch recent fines (last 5)
      const { data: fines, error: finesError } = await supabase
        .from('fines')
        .select('id, created_at, amount, status')
        .order('created_at', { ascending: false })
        .limit(3);

      if (finesError) throw finesError;

      // Format tows for display
      const formattedTows = (tows || []).map(tow => ({
        id: tow.id,
        type: 'tow' as const,
        title: `Vehicle towed from ${tow.location || 'unknown location'}`,
        time: new Date(tow.created_at).toLocaleString(),
        status: tow.status,
        created_at: tow.created_at,
      }));

      // Format complaints for display
      const formattedComplaints = (complaints || []).map(complaint => ({
        id: complaint.id,
        type: 'complaint' as const,
        title: `Complaint: ${complaint.subject || 'New complaint'}`,
        time: new Date(complaint.created_at).toLocaleString(),
        status: complaint.status,
        created_at: complaint.created_at,
      }));

      // Format fines for display
      const formattedFines = (fines || []).map(fine => ({
        id: fine.id,
        type: 'fine' as const,
        title: `Fine issued: $${fine.amount || 0}`,
        time: new Date(fine.created_at).toLocaleString(),
        status: fine.status,
        created_at: fine.created_at,
      }));

      // Combine all activities and sort by date (newest first)
      const allActivities = [...formattedTows, ...formattedComplaints, ...formattedFines];
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Take only the 4 most recent activities
      setRecentActivities(allActivities.slice(0, 4));
    } catch (error: any) {
      console.error('Error fetching recent activity:', error.message);
      // If we can't fetch activities, we'll just show empty state
      setRecentActivities([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
    fetchRecentActivity();
  };

  const DashboardCard: React.FC<DashboardCardProps> = ({
    title,
    value,
    icon,
    color,
    onPress,
    isLoading = false,
  }) => (
    <TouchableOpacity
      style={[styles.card, onPress ? styles.cardClickable : null]}
      onPress={onPress}
      disabled={!onPress || isLoading}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.cardIcon, { backgroundColor: `${color}20` }]}>
        <FontAwesome5 name={icon} size={18} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Text style={[styles.cardValue, { color }]}>{value}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const ActionButton: React.FC<ActionButtonProps> = ({
    title,
    icon,
    onPress,
    color,
    disabled = false,
  }) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <FontAwesome5 name={icon} size={16} color="white" style={styles.actionIcon} />
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  const RecentActivityItem: React.FC<{
    title: string;
    time: string;
    status: string;
    icon: string;
    color: string;
  }> = ({ title, time, status, icon, color }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
        <FontAwesome5 name={icon} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
      <View style={[styles.activityStatus, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.activityStatusText, { color }]}>{status}</Text>
      </View>
    </View>
  );

  // Helper function to determine icon and color for activity
  const getActivityIconAndColor = (type: string, status: string) => {
    switch (type) {
      case 'tow':
        if (status === 'completed') return { icon: 'check-circle', color: '#10B981' };
        if (status === 'active') return { icon: 'truck-pickup', color: '#4F46E5' };
        return { icon: 'clock', color: '#F97316' };
      case 'complaint':
        if (status === 'resolved') return { icon: 'check-circle', color: '#10B981' };
        if (status === 'in-progress') return { icon: 'comment-dots', color: '#4F46E5' };
        return { icon: 'comment-alt', color: '#EF4444' };
      case 'fine':
        if (status === 'paid') return { icon: 'check-circle', color: '#10B981' };
        return { icon: 'money-bill', color: '#F59E0B' };
      default:
        return { icon: 'bell', color: '#6B7280' };
    }
  };

  // Navigation functions
  const navigateToTowRequests = () => {
    router.push('/staff/tow-requests');
  };

  const navigateToVehicleSearch = () => {
    router.push('/staff/vehicle-search');
  };

  const navigateToIssueFine = () => {
    router.push('/staff/issue-fine');
  };

  const navigateToComplaints = () => {
    router.push('/staff/complaints');
  };

  const navigateToReports = () => {
    // router.push('/reports');
    Alert.alert('Coming Soon', 'Reports screen is under development');
  };

  const createTowRequest = () => {
    router.push('/staff/record-tow');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.title}>Tow Staff</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <ActionButton
          title="Create Tow"
          icon="plus"
          color="#4F46E5"
          onPress={createTowRequest}
        />
        <ActionButton
          title="Search Vehicle"
          icon="search"
          color="#10B981"
          onPress={navigateToVehicleSearch}
        />
        <ActionButton
          title="Issue Fine"
          icon="money-bill"
          color="#F59E0B"
          onPress={navigateToIssueFine}
        />
      </View>

      {/* Stats Overview */}
      <Text style={styles.sectionTitle}>Today's Overview</Text>
      <View style={styles.statsGrid}>
        <DashboardCard
          title="Pending Tows"
          value={stats.pendingTows}
          icon="clock"
          color="#F97316" // Orange
          onPress={navigateToTowRequests}
          isLoading={loading}
        />
        <DashboardCard
          title="Active Tows"
          value={stats.activeTows}
          icon="truck-pickup"
          color="#4F46E5" // Indigo
          onPress={navigateToTowRequests}
          isLoading={loading}
        />
        <DashboardCard
          title="Completed Today"
          value={stats.completedTowsToday}
          icon="check-circle"
          color="#10B981" // Green
          onPress={navigateToTowRequests}
          isLoading={loading}
        />
        <DashboardCard
          title="Pending Complaints"
          value={stats.pendingComplaints}
          icon="comment-alt"
          color="#EF4444" // Red
          onPress={navigateToComplaints}
          isLoading={loading}
        />
      </View>

      {/* Management Section */}
      <Text style={styles.sectionTitle}>Management</Text>
      <View style={styles.managementContainer}>
        <TouchableOpacity style={styles.managementCard} onPress={navigateToTowRequests}>
          <View style={styles.managementIconContainer}>
            <FontAwesome5 name="truck-pickup" size={24} color="#4F46E5" />
          </View>
          <Text style={styles.managementTitle}>Tow Requests</Text>
          <Text style={styles.managementDescription}>
            Manage all tow requests, assign staff, and update statuses
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.managementCard} onPress={navigateToComplaints}>
          <View style={styles.managementIconContainer}>
            <FontAwesome5 name="headset" size={24} color="#4F46E5" />
          </View>
          <Text style={styles.managementTitle}>Complaints</Text>
          <Text style={styles.managementDescription}>
            Review and respond to customer complaints
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.managementCard} onPress={navigateToReports}>
          <View style={styles.managementIconContainer}>
            <FontAwesome5 name="chart-bar" size={24} color="#4F46E5" />
          </View>
          <Text style={styles.managementTitle}>Reports</Text>
          <Text style={styles.managementDescription}>
            Generate reports and review operation statistics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity Section - Now with real data */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.recentActivityContainer}>
        {activityLoading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ padding: 20 }} />
        ) : recentActivities.length > 0 ? (
          recentActivities.map(activity => {
            const { icon, color } = getActivityIconAndColor(activity.type, activity.status);
            return (
              <RecentActivityItem
                key={`${activity.type}-${activity.id}`}
                title={activity.title}
                time={activity.time}
                status={activity.status}
                icon={icon}
                color={color}
              />
            );
          })
        ) : (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyActivityText}>No recent activity</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardClickable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  managementContainer: {
    paddingHorizontal: 16,
  },
  managementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  managementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  managementDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  recentActivityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyActivity: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
}); 