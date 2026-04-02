
-- Messages / Mail table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  diamonds_reward INTEGER NOT NULL DEFAULT 0,
  badge_reward TEXT DEFAULT NULL,
  sender_type TEXT NOT NULL DEFAULT 'system',
  claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert messages"
ON public.messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert messages"
ON public.messages FOR INSERT
WITH CHECK (sender_type = 'system');

-- Function to claim mail rewards (diamonds + badge)
CREATE OR REPLACE FUNCTION public.claim_mail_reward(_message_id UUID, _user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _msg RECORD;
BEGIN
  SELECT * INTO _msg FROM public.messages WHERE id = _message_id AND user_id = _user_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF _msg.claimed THEN RETURN 'already_claimed'; END IF;

  -- Mark as claimed
  UPDATE public.messages SET claimed = true, is_read = true WHERE id = _message_id;

  -- Award diamonds if any
  IF _msg.diamonds_reward > 0 THEN
    UPDATE public.profiles SET diamonds = diamonds + _msg.diamonds_reward WHERE user_id = _user_id;
  END IF;

  -- Award badge if any
  IF _msg.badge_reward IS NOT NULL THEN
    UPDATE public.profiles
    SET badges = array_append(badges, _msg.badge_reward)
    WHERE user_id = _user_id
      AND NOT (_msg.badge_reward = ANY(COALESCE(badges, '{}')));
  END IF;

  RETURN 'success';
END;
$$;
