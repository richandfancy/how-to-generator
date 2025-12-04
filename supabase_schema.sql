-- Create the how_tos table
create table public.how_tos (
  id text primary key,
  title text not null,
  description text,
  prompt text,
  image_url text,
  versions jsonb default '[]'::jsonb,
  current_version integer default 1,
  messages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.how_tos enable row level security;

-- Create a policy that allows anyone to read/write (since we don't have auth yet)
-- NOTE: In a real production app with users, you would restrict this to auth.uid()
create policy "Enable all access for all users" on public.how_tos
for all using (true) with check (true);

-- Create storage bucket for images if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do nothing;

-- Allow public access to images
create policy "Public Access" on storage.objects for select
using ( bucket_id = 'images' );

create policy "Public Upload" on storage.objects for insert
with check ( bucket_id = 'images' );
