
-- Create tournament_rounds table
CREATE TABLE public.tournament_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round_number)
);

-- Create tournament_scores table (score per player per round)
CREATE TABLE public.tournament_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.tournament_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.tournament_players(id) ON DELETE CASCADE,
  placement INTEGER NOT NULL CHECK (placement >= 1 AND placement <= 8),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Enable RLS
ALTER TABLE public.tournament_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_scores ENABLE ROW LEVEL SECURITY;

-- Rounds policies
CREATE POLICY "Anyone can view rounds" ON public.tournament_rounds FOR SELECT USING (true);
CREATE POLICY "Creators can insert rounds" ON public.tournament_rounds FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);
CREATE POLICY "Creators can delete rounds" ON public.tournament_rounds FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE id = tournament_id AND created_by = auth.uid())
);

-- Scores policies
CREATE POLICY "Anyone can view scores" ON public.tournament_scores FOR SELECT USING (true);
CREATE POLICY "Creators can insert scores" ON public.tournament_scores FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournament_rounds r
    JOIN public.tournaments t ON t.id = r.tournament_id
    WHERE r.id = round_id AND t.created_by = auth.uid()
  )
);
CREATE POLICY "Creators can update scores" ON public.tournament_scores FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.tournament_rounds r
    JOIN public.tournaments t ON t.id = r.tournament_id
    WHERE r.id = round_id AND t.created_by = auth.uid()
  )
);
CREATE POLICY "Creators can delete scores" ON public.tournament_scores FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tournament_rounds r
    JOIN public.tournaments t ON t.id = r.tournament_id
    WHERE r.id = round_id AND t.created_by = auth.uid()
  )
);
