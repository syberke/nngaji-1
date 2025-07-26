/*
  # Al-Qur'an Education Platform Schema

  1. User Types & Roles
    - user_role enum: admin, guru, siswa, ortu
    - user_type enum: normal, cadel, school, personal

  2. Core Tables
    - users: User management with roles
    - organizes: Classes/groups managed by teachers
    - setoran: Hafalan/Murojaah submissions
    - labels: Achievement labels for completed Juz
    - quizzes: Interactive quiz system
    - quiz_answers: Student quiz responses
    - siswa_poin: Points accumulation system

  3. Security
    - Row Level Security enabled for all tables
    - Role-based access policies
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'guru', 'siswa', 'ortu');
CREATE TYPE user_type AS ENUM ('normal', 'cadel', 'school', 'personal');
CREATE TYPE setoran_jenis AS ENUM ('hafalan', 'murojaah');
CREATE TYPE setoran_status AS ENUM ('pending', 'diterima', 'ditolak', 'selesai');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  type user_type DEFAULT 'normal',
  organize_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organizes (Classes) table
CREATE TABLE IF NOT EXISTS organizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  guru_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint after organizes table is created
ALTER TABLE users ADD CONSTRAINT fk_users_organize 
  FOREIGN KEY (organize_id) REFERENCES organizes(id);

-- Setoran (Submissions) table
CREATE TABLE IF NOT EXISTS setoran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID REFERENCES users(id),
  guru_id UUID REFERENCES users(id),
  organize_id UUID REFERENCES organizes(id),
  file_url TEXT NOT NULL,
  jenis setoran_jenis NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  status setoran_status DEFAULT 'pending',
  catatan TEXT,
  surah TEXT,
  juz INTEGER,
  poin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Labels (Achievement badges) table
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID REFERENCES users(id),
  juz INTEGER NOT NULL,
  tanggal DATE DEFAULT CURRENT_DATE,
  diberikan_oleh UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  poin INTEGER DEFAULT 10,
  organize_id UUID REFERENCES organizes(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz answers table
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  siswa_id UUID REFERENCES users(id),
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  poin INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Student points table
CREATE TABLE IF NOT EXISTS siswa_poin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID REFERENCES users(id) UNIQUE,
  total_poin INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa_poin ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for organizes table
CREATE POLICY "Teachers can read their organizes" ON organizes
  FOR SELECT TO authenticated
  USING (guru_id = auth.uid());

CREATE POLICY "Students can read their organize" ON organizes
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organize_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for setoran table
CREATE POLICY "Students can read/write own setoran" ON setoran
  FOR ALL TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can read setoran in their class" ON setoran
  FOR SELECT TO authenticated
  USING (
    organize_id IN (
      SELECT id FROM organizes 
      WHERE guru_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update setoran in their class" ON setoran
  FOR UPDATE TO authenticated
  USING (
    organize_id IN (
      SELECT id FROM organizes 
      WHERE guru_id = auth.uid()
    )
  );

-- RLS Policies for labels table
CREATE POLICY "Students can read own labels" ON labels
  FOR SELECT TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can manage labels" ON labels
  FOR ALL TO authenticated
  USING (diberikan_oleh = auth.uid());

-- RLS Policies for quiz tables
CREATE POLICY "Students can read quizzes in their class" ON quizzes
  FOR SELECT TO authenticated
  USING (
    organize_id IN (
      SELECT organize_id FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own quiz answers" ON quiz_answers
  FOR INSERT TO authenticated
  WITH CHECK (siswa_id = auth.uid());

CREATE POLICY "Students can read own quiz answers" ON quiz_answers
  FOR SELECT TO authenticated
  USING (siswa_id = auth.uid());

-- RLS Policies for siswa_poin table  
CREATE POLICY "Students can read own points" ON siswa_poin
  FOR SELECT TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can read student points in their class" ON siswa_poin
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users u
      JOIN organizes o ON u.organize_id = o.id
      WHERE o.guru_id = auth.uid()
    )
  );