-- Trigger function to delete the auth user when a client is deleted
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_client_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the auth user linked to this client
  SELECT id INTO v_user_id FROM public.profiles WHERE client_uuid = OLD.id LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS tr_delete_client_auth_user ON public.clients;
CREATE TRIGGER tr_delete_client_auth_user
BEFORE DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_on_client_delete();

-- Trigger function to delete the auth user when an employee is deleted
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_employee_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find the auth user linked to this employee
  SELECT id INTO v_user_id FROM public.profiles WHERE employee_id = OLD.id LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS tr_delete_employee_auth_user ON public.employees;
CREATE TRIGGER tr_delete_employee_auth_user
BEFORE DELETE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_on_employee_delete();
