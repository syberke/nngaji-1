/*
  # Al-Qur'an Education Platform Database Schema

  1. New Tables
    - `users` - User management with roles (admin, guru, siswa, ortu)
    - `organizes` - Classes/groups managed by teachers
    - `setoran` - Student submissions (hafalan/murojaah)
    - `labels` - Juz completion labels
    - `quizzes` - Interactive quizzes
    - `quiz_answers` - Student quiz responses
    - `siswa_poin` - Student points tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Students can only access their own data
    - Teachers can access their class data
    - Parents can access their children's data
    - Admins have full access

  3. Enums
    - user_role: admin, guru, siswa, ortu
    - user_type: normal, cadel, school, personal
    - setoran_jenis: hafalan, murojaah
    - setoran_status: pending, diterima, ditolak, selesai
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'guru', 'siswa', 'ortu');
CREATE TYPE user_type AS ENUM ('normal', 'cadel', 'school', 'personal');
CREATE TYPE setoran_jenis AS ENUM ('hafalan', 'murojaah');
CREATE TYPE setoran_status AS ENUM ('pending', 'diterima', 'ditolak', 'selesai');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL,
  type user_type DEFAULT 'normal',
  organize_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Organizes (Classes) table
CREATE TABLE IF NOT EXISTS organizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  guru_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for users.organize_id
ALTER TABLE users ADD CONSTRAINT fk_users_organize 
  FOREIGN KEY (organize_id) REFERENCES organizes(id) ON DELETE SET NULL;

-- Setoran (Submissions) table
CREATE TABLE IF NOT EXISTS setoran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid REFERENCES users(id) ON DELETE CASCADE,
  guru_id uuid REFERENCES users(id) ON DELETE CASCADE,
  organize_id uuid REFERENCES organizes(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  jenis setoran_jenis NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  status setoran_status DEFAULT 'pending',
  catatan text,
  surah text,
  juz integer,
  poin integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Labels (Juz completion) table
CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid REFERENCES users(id) ON DELETE CASCADE,
  juz integer NOT NULL,
  tanggal date DEFAULT CURRENT_DATE,
  diberikan_oleh uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_option text NOT NULL,
  poin integer DEFAULT 10,
  organize_id uuid REFERENCES organizes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Quiz answers table
CREATE TABLE IF NOT EXISTS quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  siswa_id uuid REFERENCES users(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  is_correct boolean NOT NULL,
  poin integer DEFAULT 0,
  answered_at timestamptz DEFAULT now()
);

-- Student points table
CREATE TABLE IF NOT EXISTS siswa_poin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid REFERENCES users(id) ON DELETE CASCADE,
  total_poin integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE setoran ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa_poin ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Teachers can read students in their class" ON users
  FOR SELECT TO authenticated
  USING (
    role = 'siswa' AND organize_id IN (
      SELECT id FROM organizes WHERE guru_id = auth.uid()
    )
  );

CREATE POLICY "Parents can read their children" ON users
  FOR SELECT TO authenticated
  USING (
    role = 'siswa' AND organize_id = (
      SELECT organize_id FROM users WHERE id = auth.uid() AND role = 'ortu'
    )
  );

-- Organizes policies
CREATE POLICY "Teachers can manage their classes" ON organizes
  FOR ALL TO authenticated
  USING (guru_id = auth.uid());

CREATE POLICY "Students can read their class" ON organizes
  FOR SELECT TO authenticated
  USING (
    id = (SELECT organize_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Parents can read their child's class" ON organizes
  FOR SELECT TO authenticated
  USING (
    id = (SELECT organize_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage all classes" ON organizes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Setoran policies
CREATE POLICY "Students can manage their own setoran" ON setoran
  FOR ALL TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can manage setoran in their class" ON setoran
  FOR ALL TO authenticated
  USING (guru_id = auth.uid());

CREATE POLICY "Parents can read their child's setoran" ON setoran
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id = (
        SELECT organize_id FROM users WHERE id = auth.uid() AND role = 'ortu'
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Admins can manage all setoran" ON setoran
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Labels policies
CREATE POLICY "Students can read their own labels" ON labels
  FOR SELECT TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can manage labels for their students" ON labels
  FOR ALL TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id IN (
        SELECT id FROM organizes WHERE guru_id = auth.uid()
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Parents can read their child's labels" ON labels
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id = (
        SELECT organize_id FROM users WHERE id = auth.uid() AND role = 'ortu'
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Admins can manage all labels" ON labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Quizzes policies
CREATE POLICY "Students can read quizzes in their class" ON quizzes
  FOR SELECT TO authenticated
  USING (
    organize_id = (SELECT organize_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can manage quizzes in their class" ON quizzes
  FOR ALL TO authenticated
  USING (
    organize_id IN (
      SELECT id FROM organizes WHERE guru_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all quizzes" ON quizzes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Quiz answers policies
CREATE POLICY "Students can manage their own quiz answers" ON quiz_answers
  FOR ALL TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can read quiz answers from their students" ON quiz_answers
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id IN (
        SELECT id FROM organizes WHERE guru_id = auth.uid()
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Parents can read their child's quiz answers" ON quiz_answers
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id = (
        SELECT organize_id FROM users WHERE id = auth.uid() AND role = 'ortu'
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Admins can manage all quiz answers" ON quiz_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Siswa poin policies
CREATE POLICY "Students can read their own points" ON siswa_poin
  FOR SELECT TO authenticated
  USING (siswa_id = auth.uid());

CREATE POLICY "Teachers can read points of their students" ON siswa_poin
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id IN (
        SELECT id FROM organizes WHERE guru_id = auth.uid()
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Teachers can update points of their students" ON siswa_poin
  FOR UPDATE TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id IN (
        SELECT id FROM organizes WHERE guru_id = auth.uid()
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "System can insert student points" ON siswa_poin
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Parents can read their child's points" ON siswa_poin
  FOR SELECT TO authenticated
  USING (
    siswa_id IN (
      SELECT id FROM users 
      WHERE organize_id = (
        SELECT organize_id FROM users WHERE id = auth.uid() AND role = 'ortu'
      ) AND role = 'siswa'
    )
  );

CREATE POLICY "Admins can manage all student points" ON siswa_poin
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organize_id ON users(organize_id);
CREATE INDEX IF NOT EXISTS idx_organizes_guru_id ON organizes(guru_id);
CREATE INDEX IF NOT EXISTS idx_setoran_siswa_id ON setoran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_setoran_guru_id ON setoran(guru_id);
CREATE INDEX IF NOT EXISTS idx_setoran_organize_id ON setoran(organize_id);
CREATE INDEX IF NOT EXISTS idx_setoran_status ON setoran(status);
CREATE INDEX IF NOT EXISTS idx_labels_siswa_id ON labels(siswa_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_organize_id ON quizzes(organize_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_siswa_id ON quiz_answers(siswa_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_id ON quiz_answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_siswa_poin_siswa_id ON siswa_poin(siswa_id);

-- Insert sample data for testing
INSERT INTO users (id, email, name, role, type) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@ngaji.com', 'Admin System', 'admin', 'normal'),
  ('550e8400-e29b-41d4-a716-446655440001', 'guru1@ngaji.com', 'Ustadz Ahmad', 'guru', 'normal'),
  ('550e8400-e29b-41d4-a716-446655440002', 'siswa1@ngaji.com', 'Muhammad Ali', 'siswa', 'normal'),
  ('550e8400-e29b-41d4-a716-446655440003', 'ortu1@ngaji.com', 'Bapak Ali', 'ortu', 'normal');

INSERT INTO organizes (id, name, description, guru_id) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Kelas Tahfidz A', 'Kelas hafalan untuk pemula', '550e8400-e29b-41d4-a716-446655440001'),
  ('660e8400-e29b-41d4-a716-446655440001', 'Kelas Tahfidz B', 'Kelas hafalan untuk menengah', '550e8400-e29b-41d4-a716-446655440001');

-- Update users with organize_id
UPDATE users SET organize_id = '660e8400-e29b-41d4-a716-446655440000' 
WHERE id IN ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003');

-- Insert sample quiz
INSERT INTO quizzes (question, options, correct_option, poin, organize_id) VALUES
  ('Berapa jumlah ayat dalam Surah Al-Fatihah?', '["5", "6", "7", "8"]', '7', 10, '660e8400-e29b-41d4-a716-446655440000'),
  ('Surah apa yang disebut sebagai "Ummul Kitab"?', '["Al-Baqarah", "Al-Fatihah", "An-Nas", "Al-Ikhlas"]', 'Al-Fatihah', 15, '660e8400-e29b-41d4-a716-446655440000');