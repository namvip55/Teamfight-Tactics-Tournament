
-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_players INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'grouped', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tournament_players table
CREATE TABLE public.tournament_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  group_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their tournaments" ON public.tournaments FOR DELETE USING (auth.uid() = created_by);

-- Tournament players policies
CREATE POLICY "Anyone can view tournament players" ON public.tournament_players FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add players" ON public.tournament_players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
CREATE POLICY "Creators can update players" ON public.tournament_players FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
CREATE POLICY "Creators can delete players" ON public.tournament_players FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);

-- Timestamp trigger for tournaments
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
