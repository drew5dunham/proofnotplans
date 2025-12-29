-- Create storage bucket for goal proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-proofs', 'goal-proofs', true);

-- Allow anyone to view proof photos (public bucket)
CREATE POLICY "Public can view goal proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'goal-proofs');

-- Allow authenticated users to upload their own proofs
CREATE POLICY "Users can upload their own proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'goal-proofs');

-- Allow users to delete their own proofs
CREATE POLICY "Users can delete their own proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'goal-proofs');