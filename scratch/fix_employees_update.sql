ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable update for employees" ON employees;
CREATE POLICY "Enable update for employees" ON employees FOR UPDATE USING (true);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable update for profiles" ON profiles;
CREATE POLICY "Enable update for profiles" ON profiles FOR UPDATE USING (true);
