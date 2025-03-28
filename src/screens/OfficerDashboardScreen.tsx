import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../api/supabase';
import { useSession } from '../context/SessionContext';

interface RecentActivity {
  id: string;
  type: 'fine' | 'complaint' | 'tow';
  title: string;
  time: string;
  status: string;
}

interface ActionButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}

export default function OfficerDashboardScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (session?.user) {
      fetchRecentActivity();
    }
  }, [session]);

  const fetchRecentActivity = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      // Fetch recent fines
      const { data: fines, error: finesError } = await supabase
        .from('fines')
        .select('id, amount, description, issue_date, status')
        .eq('created_by', session.user.id)
        .order('issue_date', { ascending: false })
        .limit(5);

      if (finesError) throw finesError;

      const formattedActivity = (fines || []).map(fine => ({
        id: fine.id,
        type: 'fine' as const,
        title: `Fine issued: $${fine.amount}`,
        time: new Date(fine.issue_date).toLocaleDateString(),
        status: fine.status,
      }));

      setRecentActivity(formattedActivity);
    } catch (error: any) {
      console.error('Error fetching recent activity:', error.message);
      Alert.alert('Error', 'Failed to load recent activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecentActivity();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      console.error('Error signing out:', error.message);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

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
    type: 'fine' | 'complaint' | 'tow';
    id: string;
  }> = ({ title, time, status, type }) => {
    const { icon, color } = getActivityIconAndColor(type, status);
    return (
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
  };

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
  const navigateToIssueFine = () => {
    router.push('/officer/issue-fine');
  };

  const navigateToVehicleSearch = () => {
    router.push('/staff/vehicle-search');
  };

  const navigateToComplaints = () => {
    router.push('/staff/complaints');
  };

  const navigateToReports = () => {
    Alert.alert('Coming Soon', 'Reports screen is under development');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome, Officer</Text>
          <Text style={styles.subText}>Manage fines and enforce regulations</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <FontAwesome5 name="sign-out-alt" size={20} color="#4F46E5" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <ActionButton
            title="Issue Fine"
            icon="money-bill-wave"
            onPress={navigateToIssueFine}
            color="#EF4444"
          />
          <ActionButton
            title="Search Vehicles"
            icon="search"
            onPress={navigateToVehicleSearch}
            color="#3B82F6"
          />
          <ActionButton
            title="Review Complaints"
            icon="exclamation-circle"
            onPress={navigateToComplaints}
            color="#F59E0B"
          />
          <ActionButton
            title="Reports"
            icon="chart-bar"
            onPress={navigateToReports}
            color="#6366F1"
          />
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <RecentActivityItem key={activity.id} {...activity} />
          ))
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  logoutText: {
    marginLeft: 8,
    color: '#4F46E5',
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  recentActivity: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  activityTime: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  activityStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activityStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginTop: 20,
  },
  emptyActivity: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
}); 