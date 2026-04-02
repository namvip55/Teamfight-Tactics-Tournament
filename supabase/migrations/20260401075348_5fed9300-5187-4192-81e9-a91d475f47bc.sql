
-- 1. Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. RLS for user_roles: anyone can read, only admins can modify
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add reward_diamonds column to tournaments
ALTER TABLE public.tournaments ADD COLUMN reward_diamonds JSONB DEFAULT '{"1":50,"2":40,"3":35,"4":30,"5":25,"6":20,"7":15,"8":10,"9":5,"10":3}'::jsonb;

-- 5. Function to award diamonds (security definer so it can update profiles)
CREATE OR REPLACE FUNCTION public.award_diamonds(_user_id UUID, _amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET diamonds = diamonds + _amount WHERE user_id = _user_id;
END;
$$;

-- 6. Function for checkin diamond reward
CREATE OR REPLACE FUNCTION public.checkin_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _streak INTEGER := 0;
  _bonus INTEGER := 0;
  _dates DATE[];
  _start DATE;
  _expected DATE;
  _i INTEGER;
BEGIN
  -- Get recent checkin dates
  SELECT ARRAY_AGG(checked_in_at ORDER BY checked_in_at DESC)
  INTO _dates
  FROM public.checkins
  WHERE user_id = NEW.user_id;

  -- Calculate streak (including today's new checkin)
  _start := CURRENT_DATE;
  FOR _i IN 1..COALESCE(array_length(_dates, 1), 0) LOOP
    _expected := _start - (_i - 1);
    IF _dates[_i] = _expected THEN
      _streak := _streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Base 10 diamonds + 5 bonus if streak > 3
  _bonus := 10;
  IF _streak > 3 THEN
    _bonus := 15;
  END IF;

  UPDATE public.profiles SET diamonds = diamonds + _bonus WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checkin_reward
AFTER INSERT ON public.checkins
FOR EACH ROW EXECUTE FUNCTION public.checkin_reward();

-- 7. Shop items table
CREATE TABLE public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL DEFAULT 'frame',
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_type, item_id)
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shop items" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop items" ON public.shop_items FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update shop items" ON public.shop_items FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete shop items" ON public.shop_items FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 8. User purchases table
CREATE TABLE public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON public.user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.user_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Insert default shop items (frames)
INSERT INTO public.shop_items (item_type, item_id, name, price, description) VALUES
  ('frame', 'lover', 'Lover', 50, 'Khung hồng tím lãng mạn'),
  ('frame', 'ocean', 'Ocean', 50, 'Khung xanh biển mát mẻ'),
  ('frame', 'fire', 'Fire', 80, 'Khung lửa nóng bỏng'),
  ('frame', 'gold', 'Gold', 120, 'Khung vàng sang trọng');

-- 10. Purchase function (deducts diamonds atomically)
CREATE OR REPLACE FUNCTION public.purchase_item(_user_id UUID, _item_type TEXT, _item_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _price INTEGER;
  _current_diamonds INTEGER;
BEGIN
  -- Check if already purchased
  IF EXISTS (SELECT 1 FROM public.user_purchases WHERE user_id = _user_id AND item_type = _item_type AND item_id = _item_id) THEN
    RETURN 'already_owned';
  END IF;

  -- Get price
  SELECT price INTO _price FROM public.shop_items WHERE item_type = _item_type AND item_id = _item_id;
  IF _price IS NULL THEN RETURN 'not_found'; END IF;

  -- Check balance
  SELECT diamonds INTO _current_diamonds FROM public.profiles WHERE user_id = _user_id;
  IF _current_diamonds < _price THEN RETURN 'insufficient'; END IF;

  -- Deduct and record
  UPDATE public.profiles SET diamonds = diamonds - _price WHERE user_id = _user_id;
  INSERT INTO public.user_purchases (user_id, item_type, item_id) VALUES (_user_id, _item_type, _item_id);
  RETURN 'success';
END;
$$;
