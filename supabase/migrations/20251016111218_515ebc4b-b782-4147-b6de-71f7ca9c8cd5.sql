-- 1) Create SECURITY DEFINER function to avoid recursive RLS
create or replace function public.is_member_of_conversation(conv_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conv_id
      and cp.user_id = _user_id
  );
$$;

-- 2) Fix recursive/incorrect policies on conversation_participants
-- Drop and recreate SELECT policy using the function
drop policy if exists "Users can view participants of their conversations" on public.conversation_participants;
create policy "Users can view participants of their conversations"
on public.conversation_participants
for select
to authenticated
using (
  public.is_member_of_conversation(conversation_participants.conversation_id, auth.uid())
);

-- Tighten INSERT policy: ensure users can only insert their own record
drop policy if exists "Users can join conversations" on public.conversation_participants;
create policy "Users can join conversations"
on public.conversation_participants
for insert
to authenticated
with check (
  auth.uid() = user_id
);

-- Keep existing UPDATE/DELETE policies (auth.uid() = user_id)

-- 3) Fix conversations SELECT policy to use function
drop policy if exists "Users can view conversations they participate in" on public.conversations;
create policy "Users can view conversations they participate in"
on public.conversations
for select
to authenticated
using (
  public.is_member_of_conversation(conversations.id, auth.uid())
);

-- 4) Storage policies for avatars bucket
-- Make avatars publicly readable and restrict write/update/delete to the owner folder (user_id prefix)
-- We drop and recreate to ensure consistency

drop policy if exists "Avatars: anyone can view" on storage.objects;
create policy "Avatars: anyone can view"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Avatars: users can upload own" on storage.objects;
create policy "Avatars: users can upload own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatars: users can update own" on storage.objects;
create policy "Avatars: users can update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatars: users can delete own" on storage.objects;
create policy "Avatars: users can delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
