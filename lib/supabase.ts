import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export type UserRole = 'admin' | 'guru' | 'siswa' | 'ortu';
export type UserType = 'normal' | 'cadel' | 'school' | 'personal';
export type SetoranJenis = 'hafalan' | 'murojaah';
export type SetoranStatus = 'pending' | 'diterima' | 'ditolak' | 'selesai';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  type?: UserType;
  organize_id?: string;
  created_at: string;
}

export interface Organize {
  id: string;
  name: string;
  description?: string;
  guru_id: string;
  created_at: string;
}

export interface Setoran {
  id: string;
  siswa_id: string;
  guru_id: string;
  organize_id: string;
  file_url: string;
  jenis: SetoranJenis;
  tanggal: string;
  status: SetoranStatus;
  catatan?: string;
  surah?: string;
  juz?: number;
  poin: number;
  created_at: string;
}

export interface Label {
  id: string;
  siswa_id: string;
  juz: number;
  tanggal: string;
  diberikan_oleh: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_option: string;
  poin: number;
  organize_id: string;
  created_at: string;
}

export interface QuizAnswer {
  id: string;
  quiz_id: string;
  siswa_id: string;
  selected_option: string;
  is_correct: boolean;
  poin: number;
  answered_at: string;
}

export interface SiswaPoin {
  id: string;
  siswa_id: string;
  total_poin: number;
  updated_at: string;
}