import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { supabase, Setoran, SiswaPoin } from '@/lib/supabase';
import {
  BookOpen,
  Trophy,
  Target,
  Users,
  TrendingUp,
  LogOut,
} from 'lucide-react-native';

export default function HomeScreen() {
  const { user, signOut } = useAuthContext();
  const [stats, setStats] = useState({
    totalSetoran: 0,
    totalPoin: 0,
    pendingSetoran: 0,
    completedJuz: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (user.role === 'siswa') {
        // Fetch student stats
        const [setoranRes, poinRes] = await Promise.all([
          supabase
            .from('setoran')
            .select('*')
            .eq('siswa_id', user.id),
          supabase
            .from('siswa_poin')
            .select('total_poin')
            .eq('siswa_id', user.id)
            .single(),
        ]);

        const setoran = setoranRes.data || [];
        const pending = setoran.filter(s => s.status === 'pending').length;
        const completed = setoran.filter(s => s.status === 'selesai').length;

        setStats({
          totalSetoran: setoran.length,
          totalPoin: poinRes.data?.total_poin || 0,
          pendingSetoran: pending,
          completedJuz: Math.floor(completed / 10), // Rough estimate
        });

      } else if (user.role === 'guru') {
        // Fetch teacher stats
        const { data: setoran } = await supabase
          .from('setoran')
          .select('*')
          .eq('guru_id', user.id);

        const pending = setoran?.filter(s => s.status === 'pending').length || 0;

        setStats({
          totalSetoran: setoran?.length || 0,
          totalPoin: 0,
          pendingSetoran: pending,
          completedJuz: 0,
        });
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin': return 'Administrator';
      case 'guru': return 'Guru';
      case 'siswa': return 'Siswa';
      case 'ortu': return 'Orang Tua';
      default: return 'User';
    }
  };

  const getStatsCards = () => {
    if (user?.role === 'siswa') {
      return [
        {
          title: 'Total Setoran',
          value: stats.totalSetoran,
          icon: BookOpen,
          color: '#3B82F6',
          bgColor: '#EFF6FF',
        },
        {
          title: 'Total Poin',
          value: stats.totalPoin,
          icon: Trophy,
          color: '#F59E0B',
          bgColor: '#FFFBEB',
        },
        {
          title: 'Pending Review',
          value: stats.pendingSetoran,
          icon: Target,
          color: '#EF4444',
          bgColor: '#FEF2F2',
        },
        {
          title: 'Juz Selesai',
          value: stats.completedJuz,
          icon: TrendingUp,
          color: '#10B981',
          bgColor: '#ECFDF5',
        },
      ];
    } else if (user?.role === 'guru') {
      return [
        {
          title: 'Total Setoran',
          value: stats.totalSetoran,
          icon: BookOpen,
          color: '#3B82F6',
          bgColor: '#EFF6FF',
        },
        {
          title: 'Perlu Review',
          value: stats.pendingSetoran,
          icon: Target,
          color: '#EF4444',
          bgColor: '#FEF2F2',
        },
      ];
    }
    return [];
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>{getRoleTitle()}</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {getStatsCards().map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
              <stat.icon size={24} color={stat.color} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Utama</Text>
        <View style={styles.quickActions}>
          {user.role === 'siswa' && (
            <>
              <TouchableOpacity style={styles.actionCard}>
                <BookOpen size={32} color="#10B981" />
                <Text style={styles.actionTitle}>Baca Al-Qur'an</Text>
                <Text style={styles.actionSubtitle}>Baca dan dengarkan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Trophy size={32} color="#F59E0B" />
                <Text style={styles.actionTitle}>Quiz Harian</Text>
                <Text style={styles.actionSubtitle}>Kerjakan soal</Text>
              </TouchableOpacity>
            </>
          )}
          
          {user.role === 'guru' && (
            <>
              <TouchableOpacity style={styles.actionCard}>
                <Users size={32} color="#3B82F6" />
                <Text style={styles.actionTitle}>Kelola Siswa</Text>
                <Text style={styles.actionSubtitle}>Lihat progress</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard}>
                <Target size={32} color="#EF4444" />
                <Text style={styles.actionTitle}>Review Setoran</Text>
                <Text style={styles.actionSubtitle}>Nilai hafalan</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>
            Belum ada aktivitas terbaru
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#10B981',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: '#ECFDF5',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#ECFDF5',
  },
  signOutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activityText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});