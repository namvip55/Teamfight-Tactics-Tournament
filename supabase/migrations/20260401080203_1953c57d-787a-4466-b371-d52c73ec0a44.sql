
-- Add user_id and is_ready to tournament_players
ALTER TABLE public.tournament_players ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tournament_players ADD COLUMN is_ready BOOLEAN NOT NULL DEFAULT false;

-- Allow any authenticated user to register themselves
CREATE POLICY "Users can register themselves" ON public.tournament_players
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (SELECT status FROM tournaments WHERE id = tournament_id) = 'open'
);

-- Allow users to update their own ready status
CREATE POLICY "Users can update own ready status" ON public.tournament_players
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
