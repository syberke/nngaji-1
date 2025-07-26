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
import { supabase, Quiz, QuizAnswer } from '@/lib/supabase';
import {
  Brain,
  Trophy,
  CircleCheck as CheckCircle,
  Circle as XCircle,
  Clock,
  Award,
} from 'lucide-react-native';

export default function QuizScreen() {
  const { user } = useAuthContext();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
      fetchUserAnswers();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    if (!user?.organize_id) return;

    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('organize_id', user.organize_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnswers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('siswa_id', user.id);

      if (error) throw error;

      const answers = data || [];
      setUserAnswers(answers);

      const points = answers.reduce(
        (sum, answer) => sum + (answer.poin || 0),
        0
      );
      setTotalPoints(points);
    } catch (error) {
      console.error('Error fetching user answers:', error);
    }
  };

  const selectQuiz = (quiz: Quiz) => {
    const alreadyAnswered = userAnswers.some(
      (answer) => answer.quiz_id === quiz.id
    );

    if (alreadyAnswered) {
      Alert.alert('Info', 'Anda sudah menjawab quiz ini sebelumnya');
      return;
    }

    setCurrentQuiz(quiz);
    setSelectedAnswer('');
  };

  const submitAnswer = async () => {
    if (!currentQuiz || !selectedAnswer || !user) return;

    setAnswering(true);

    try {
      const isCorrect = selectedAnswer === currentQuiz.correct_option;
      const points = isCorrect ? currentQuiz.poin : 0;

      // Insert answer
      const { error: answerError } = await supabase
        .from('quiz_answers')
        .insert([
          {
            quiz_id: currentQuiz.id,
            siswa_id: user.id,
            selected_option: selectedAnswer,
            is_correct: isCorrect,
            poin: points,
          },
        ]);

      if (answerError) throw answerError;

      // Update or create student points
      const { data: existingPoints, error: fetchError } = await supabase
        .from('siswa_poin')
        .select('*')
        .eq('siswa_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingPoints) {
        // Update existing points
        const { error: updateError } = await supabase
          .from('siswa_poin')
          .update({
            total_poin: existingPoints.total_poin + points,
            updated_at: new Date().toISOString(),
          })
          .eq('siswa_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new points record
        const { error: insertError } = await supabase
          .from('siswa_poin')
          .insert([
            {
              siswa_id: user.id,
              total_poin: points,
            },
          ]);

        if (insertError) throw insertError;
      }

      // Show result
      Alert.alert(
        isCorrect ? 'Benar!' : 'Kurang Tepat',
        isCorrect
          ? `Selamat! Anda mendapat ${points} poin`
          : `Jawaban yang benar adalah: ${currentQuiz.correct_option}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCurrentQuiz(null);
              setSelectedAnswer('');
              fetchUserAnswers();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting answer:', error);
      Alert.alert('Error', 'Failed to submit answer');
    } finally {
      setAnswering(false);
    }
  };

  const getAnsweredQuizIds = () => {
    return userAnswers.map((answer) => answer.quiz_id);
  };

  const getCorrectAnswersCount = () => {
    return userAnswers.filter((answer) => answer.is_correct).length;
  };

  if (user?.role !== 'siswa' && user?.role !== 'guru') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            This feature is available for students and teachers
          </Text>
        </View>
      </View>
    );
  }

  if (currentQuiz) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Quiz</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentQuiz(null)}
          >
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quizContainer}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuiz.question}</Text>
            <View style={styles.pointsBadge}>
              <Trophy size={16} color="#F59E0B" />
              <Text style={styles.pointsText}>{currentQuiz.poin} poin</Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            {currentQuiz.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === option && styles.optionButtonSelected,
                ]}
                onPress={() => setSelectedAnswer(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAnswer === option && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedAnswer || answering) && styles.submitButtonDisabled,
            ]}
            onPress={submitAnswer}
            disabled={!selectedAnswer || answering}
          >
            <Text style={styles.submitButtonText}>
              {answering ? 'Menjawab...' : 'Kirim Jawaban'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quiz Interaktif</Text>
        <Text style={styles.subtitle}>Asah pengetahuan Al-Qur'an Anda</Text>
      </View>

      {user?.role === 'siswa' && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
              <Award size={24} color="#F59E0B" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statTitle}>Total Poin</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle size={24} color="#10B981" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{getCorrectAnswersCount()}</Text>
              <Text style={styles.statTitle}>Benar</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
              <Brain size={24} color="#3B82F6" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{userAnswers.length}</Text>
              <Text style={styles.statTitle}>Total Quiz</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daftar Quiz</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading quiz...</Text>
          </View>
        ) : quizzes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Brain size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Belum ada quiz tersedia</Text>
          </View>
        ) : (
          <View style={styles.quizList}>
            {quizzes.map((quiz, index) => {
              const isAnswered = getAnsweredQuizIds().includes(quiz.id);
              const userAnswer = userAnswers.find((a) => a.quiz_id === quiz.id);

              return (
                <TouchableOpacity
                  key={quiz.id}
                  style={[
                    styles.quizCard,
                    isAnswered && styles.quizCardAnswered,
                  ]}
                  onPress={() => user?.role === 'siswa' && selectQuiz(quiz)}
                  disabled={user?.role !== 'siswa'}
                >
                  <View style={styles.quizCardHeader}>
                    <Text style={styles.quizNumber}>Quiz #{index + 1}</Text>
                    <View style={styles.quizStatus}>
                      {isAnswered ? (
                        userAnswer?.is_correct ? (
                          <CheckCircle size={20} color="#10B981" />
                        ) : (
                          <XCircle size={20} color="#EF4444" />
                        )
                      ) : (
                        <Clock size={20} color="#F59E0B" />
                      )}
                    </View>
                  </View>

                  <Text style={styles.quizQuestion} numberOfLines={2}>
                    {quiz.question}
                  </Text>

                  <View style={styles.quizFooter}>
                    <View style={styles.quizPoints}>
                      <Trophy size={16} color="#F59E0B" />
                      <Text style={styles.quizPointsText}>
                        {quiz.poin} poin
                      </Text>
                    </View>

                    {isAnswered && (
                      <Text style={styles.quizAnsweredText}>
                        {userAnswer?.is_correct ? 'Benar' : 'Salah'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
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
    backgroundColor: '#3B82F6',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#DBEAFE',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    marginTop: -20,
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
  statContent: {
    alignItems: 'center',
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
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  quizList: {
    gap: 12,
  },
  quizCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quizCardAnswered: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  quizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  quizStatus: {
    padding: 4,
  },
  quizQuestion: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
    lineHeight: 24,
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quizPointsText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  quizAnsweredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Quiz answering styles
  quizContainer: {
    padding: 20,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  questionText: {
    fontSize: 18,
    color: '#111827',
    lineHeight: 28,
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  optionsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  optionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
