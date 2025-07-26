import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthContext } from '@/context/AuthContext';
import { supabase, SetoranJenis } from '@/lib/supabase';
import { CloudinaryService } from '@/services/cloudinary';
import {
  Upload,
  Mic,
  BookOpen,
  RotateCcw,
  Send,
  FileAudio,
} from 'lucide-react-native';

export default function UploadScreen() {
  const { user } = useAuthContext();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [jenis, setJenis] = useState<SetoranJenis>('hafalan');
  const [surah, setSurah] = useState('');
  const [juz, setJuz] = useState('');
  const [catatan, setCatatan] = useState('');
  const [uploading, setUploading] = useState(false);

  const startRecording = async () => {
    try {
      const permissionResponse = await Audio.requestPermissionsAsync();
      
      if (permissionResponse.status !== 'granted') {
        Alert.alert('Error', 'Permission to access microphone is required!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setSelectedFile(null);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      if (uri) {
        setSelectedFile({
          uri,
          type: 'audio/m4a',
          name: `recording_${Date.now()}.m4a`,
        });
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
        setRecording(null);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const submitSetoran = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please record or select an audio file');
      return;
    }

    if (!surah.trim()) {
      Alert.alert('Error', 'Please enter surah name');
      return;
    }

    if (!user?.organize_id) {
      Alert.alert('Error', 'You are not assigned to any class');
      return;
    }

    setUploading(true);

    try {
      // Upload file to Cloudinary
      const fileUrl = await CloudinaryService.uploadAudio(selectedFile.uri);

      // Get teacher ID from organize
      const { data: organize, error: organizeError } = await supabase
        .from('organizes')
        .select('guru_id')
        .eq('id', user.organize_id)
        .single();

      if (organizeError || !organize) {
        throw new Error('Failed to find class teacher');
      }

      // Insert setoran record
      const { error: setoranError } = await supabase
        .from('setoran')
        .insert([
          {
            siswa_id: user.id,
            guru_id: organize.guru_id,
            organize_id: user.organize_id,
            file_url: fileUrl,
            jenis,
            surah: surah.trim(),
            juz: juz ? parseInt(juz) : null,
            catatan: catatan.trim() || null,
            tanggal: new Date().toISOString().split('T')[0],
          },
        ]);

      if (setoranError) {
        throw setoranError;
      }

      Alert.alert(
        'Success',
        'Setoran berhasil dikirim! Menunggu review dari guru.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedFile(null);
              setSurah('');
              setJuz('');
              setCatatan('');
            },
          },
        ]
      );

    } catch (error) {
      console.error('Error submitting setoran:', error);
      Alert.alert('Error', 'Failed to submit setoran. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (user?.role !== 'siswa') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            This feature is only available for students
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload Setoran</Text>
        <Text style={styles.subtitle}>
          Kirim hafalan atau murojaah Anda
        </Text>
      </View>

      {/* Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jenis Setoran</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              jenis === 'hafalan' && styles.typeButtonActive,
            ]}
            onPress={() => setJenis('hafalan')}
          >
            <BookOpen
              size={20}
              color={jenis === 'hafalan' ? 'white' : '#10B981'}
            />
            <Text
              style={[
                styles.typeButtonText,
                jenis === 'hafalan' && styles.typeButtonTextActive,
              ]}
            >
              Hafalan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              jenis === 'murojaah' && styles.typeButtonActive,
            ]}
            onPress={() => setJenis('murojaah')}
          >
            <RotateCcw
              size={20}
              color={jenis === 'murojaah' ? 'white' : '#10B981'}
            />
            <Text
              style={[
                styles.typeButtonText,
                jenis === 'murojaah' && styles.typeButtonTextActive,
              ]}
            >
              Murojaah
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Audio Recording/Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio File</Text>
        
        {selectedFile ? (
          <View style={styles.fileSelected}>
            <FileAudio size={24} color="#10B981" />
            <Text style={styles.fileName}>{selectedFile.name}</Text>
            <TouchableOpacity
              onPress={() => setSelectedFile(null)}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.audioActions}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Mic size={24} color={isRecording ? '#EF4444' : 'white'} />
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.orText}>atau</Text>

            <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
              <Upload size={24} color="#10B981" />
              <Text style={styles.uploadButtonText}>Choose File</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Form Fields */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detail Setoran</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nama Surah *</Text>
          <TextInput
            style={styles.input}
            value={surah}
            onChangeText={setSurah}
            placeholder="Contoh: Al-Fatihah"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Juz (Opsional)</Text>
          <TextInput
            style={styles.input}
            value={juz}
            onChangeText={setJuz}
            placeholder="Contoh: 1"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Catatan (Opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={catatan}
            onChangeText={setCatatan}
            placeholder="Tambahkan catatan jika diperlukan"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Submit Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (uploading || !selectedFile || !surah.trim()) && styles.submitButtonDisabled,
          ]}
          onPress={submitSetoran}
          disabled={uploading || !selectedFile || !surah.trim()}
        >
          <Send size={20} color="white" />
          <Text style={styles.submitButtonText}>
            {uploading ? 'Mengirim...' : 'Kirim Setoran'}
          </Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ECFDF5',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'white',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  audioActions: {
    alignItems: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  recordButtonActive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  orText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  fileSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
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