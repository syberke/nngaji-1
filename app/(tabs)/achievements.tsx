import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import { useAuthContext } from '@/context/AuthContext';
import { supabase, Label, SiswaPoin } from '@/lib/supabase';
import {
  Trophy,
  Award,
  Target,
  Crown,
  Star,
  Medal,
} from 'lucide-react-native';

export default function AchievementsScreen() {
  const { user } = useAuthContext();
  const [labels, setLabels] = useState<Label[]>([]);
  const [points, setPoints] = useState<SiswaPoin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (user.role === 'siswa') {
        // Fetch student's labels and points
        const [labelsRes, pointsRes] = await Promise.all([
          supabase
            .from('labels')
            .select('*')
            .eq('siswa_id', user.id)
            .order('juz'),
          supabase
            .from('siswa_poin')
            .select('*')
            .eq('siswa_id', user.id)
            .single(),
        ]);

        setLabels(labelsRes.data || []);
        setPoints(pointsRes.data);

      } else if (user.role === 'ortu') {
        // Fetch child's achievements (assuming single child for now)
        const { data: childrenData } = await supabase
          .from('users')
          .select('id')
          .eq('organize_id', user.organize_id)
          .eq('role', 'siswa');

        if (childrenData && childrenData.length > 0) {
          const childId = childrenData[0].id;
          
          const [labelsRes, pointsRes] = await Promise.all([
            supabase
              .from('labels')
              .select('*')
              .eq('siswa_id', childId)
              .order('juz'),
            supabase
              .from('siswa_poin')
              .select('*')
              .eq('siswa_id', childId)
              .single(),
          ]);

          setLabels(labelsRes.data || []);
          setPoints(pointsRes.data);
        }
      }

    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementLevel = (totalPoints: number) => {
    if (totalPoints >= 1000) return { level: 'Master', icon: Crown, color: '#F59E0B' };
    if (totalPoints >= 500) return { level: 'Expert', icon: Trophy, color: '#EF4444' };
    if (totalPoints >= 200) return { level: 'Advanced', icon: Award, color: '#8B5CF6' };
    if (totalPoints >= 100) return { level: 'Intermediate', icon: Medal, color: '#3B82F6' };
    return { level: 'Beginner', icon: Star, color: '#10B981' };
  };

  const getJuzCompletionRate = () => {
    return (labels.length / 30) * 100; // 30 juz total
  };

  const renderJuzCard = ({ item }: { item: Label }) => (
    <View style={styles.juzCard}>
      <View style={styles.juzIcon}>
        <Trophy size={24} color="#F59E0B" />
      </View>
      <View style={styles.juzContent}>
        <Text style={styles.juzTitle}>Juz {item.juz}</Text>
        <Text style={styles.juzDate}>
          {new Date(item.tanggal).toLocaleDateString('id-ID')}
        </Text>
      </View>
      <View style={styles.juzBadge}>
        <Text style={styles.juzBadgeText}>Selesai</Text>
      </View>
    </View>
  );

  if (!user || (user.role !== 'siswa' && user.role !== 'ortu')) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            This feature is available for students and parents
          </Text>
        </View>
      </View>
    );
  }

  const achievement = getAchievementLevel(points?.total_poin || 0);
  const completionRate = getJuzCompletionRate();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prestasi</Text>
        <Text style={styles.subtitle}>
          {user.role === 'ortu' ? 'Prestasi Anak' : 'Pencapaian Anda'}
        </Text>
      </View>

      {/* Achievement Level */}
      <View style={styles.levelContainer}>
        <View style={styles.levelCard}>
          <View style={[styles.levelIcon, { backgroundColor: `${achievement.color}20` }]}>
            <achievement.icon size={32} color={achievement.color} />
          </View>
          <View style={styles.levelContent}>
            <Text style={styles.levelTitle}>{achievement.level}</Text>
            <Text style={styles.levelPoints}>
              {points?.total_poin || 0} poin
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
            <Trophy size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{labels.length}</Text>
          <Text style={styles.statTitle}>Juz Selesai</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
            <Target size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{completionRate.toFixed(0)}%</Text>
          <Text style={styles.statTitle}>Progress</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
            <Award size={24} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{points?.total_poin || 0}</Text>
          <Text style={styles.statTitle}>Total Poin</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Progress Al-Qur'an</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(completionRate, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {labels.length} dari 30 Juz ({completionRate.toFixed(0)}%)
        </Text>
      </View>

      {/* Completed Juz List */}
      <View style={styles.juzSection}>
        <Text style={styles.sectionTitle}>Juz Yang Telah Diselesaikan</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading achievements...</Text>
          </View>
        ) : labels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Trophy size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              Belum ada juz yang diselesaikan
            </Text>
            <Text style={styles.emptySubtext}>
              Terus belajar dan raih prestasi pertama Anda!
            </Text>
          </View>
        ) : (
          <FlatList
            data={labels}
            renderItem={renderJuzCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Upcoming Achievements */}
      <View style={styles.upcomingSection}>
        <Text style={styles.sectionTitle}>Target Selanjutnya</Text>
        
        <View style={styles.targetCard}>
          <View style={styles.targetIcon}>
            <Target size={24} color="#3B82F6" />
          </View>
          <View style={styles.targetContent}>
            <Text style={styles.targetTitle}>Juz Berikutnya</Text>
            <Text style={styles.targetDescription}>
              Selesaikan juz {labels.length + 1} untuk mendapat poin bonus
            </Text>
          </View>
        </View>

        {points && points.total_poin < 1000 && (
          <View style={styles.targetCard}>
            <View style={styles.targetIcon}>
              <Crown size={24} color="#F59E0B" />
            </View>
            <View style={styles.targetContent}>
              <Text style={styles.targetTitle}>Level Master</Text>
              <Text style={styles.targetDescription}>
                Kumpulkan {1000 - points.total_poin} poin lagi untuk mencapai level Master
              </Text>
            </View>
          </View>
        )}
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
    backgroundColor: '#F59E0B',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FEF3C7',
  },
  levelContainer: {
    padding: 20,
    paddingTop: 0,
    marginTop: -20,
  },
  levelCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  levelIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  levelContent: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  levelPoints: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressSection: {
    padding: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  juzSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  juzCard: {
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
  juzIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  juzContent: {
    flex: 1,
  },
  juzTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  juzDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  juzBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  juzBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  upcomingSection: {
    padding: 20,
    paddingTop: 0,
  },
  targetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  targetIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  targetContent: {
    flex: 1,
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  targetDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});