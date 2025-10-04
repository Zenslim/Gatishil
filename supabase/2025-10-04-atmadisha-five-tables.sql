
-- Ātma Diśā Five Tables migration
-- Date: 2025-10-04

-- 0) Drop old single-table setup if it exists
drop table if exists atma_options cascade;

-- 1) Create new tables
create table if not exists "Occupation" (
  id bigserial primary key,
  label text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists "Skill" (
  id bigserial primary key,
  label text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists "Passion" (
  id bigserial primary key,
  label text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists "Compassion" (
  id bigserial primary key,
  label text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists "Vision" (
  id bigserial primary key,
  label text not null unique,
  created_at timestamptz not null default now()
);

-- 2) Enable RLS and add public read policies (anon & authenticated) for dropdowns
alter table "Occupation" enable row level security;
alter table "Skill" enable row level security;
alter table "Passion" enable row level security;
alter table "Compassion" enable row level security;
alter table "Vision" enable row level security;

-- Policies: allow read to everyone, no inserts from public (managed via SQL seeds or admin UI)

do $$ begin
  if not exists (select 1 from pg_policies where polname='read_occupation_public') then
    create policy read_occupation_public on "Occupation"
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='read_skill_public') then
    create policy read_skill_public on "Skill"
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='read_passion_public') then
    create policy read_passion_public on "Passion"
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='read_compassion_public') then
    create policy read_compassion_public on "Compassion"
      for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where polname='read_vision_public') then
    create policy read_vision_public on "Vision"
      for select to anon, authenticated using (true);
  end if;
end $$;

-- 3) Seed data
insert into "Occupation" (label) values
('Farmer'),
('Teacher'),
('Student'),
('Engineer'),
('Doctor'),
('Nurse'),
('Healer'),
('Craftsperson'),
('Artist'),
('Musician'),
('Writer'),
('Journalist'),
('Photographer'),
('Filmmaker'),
('Designer'),
('Architect'),
('Social Worker'),
('Volunteer'),
('Entrepreneur'),
('Researcher'),
('Scientist'),
('Programmer'),
('Data Analyst'),
('Mechanic'),
('Driver'),
('Tailor'),
('Weaver'),
('Mason'),
('Carpenter'),
('Electrician'),
('Plumber'),
('Security Guard'),
('Delivery Rider'),
('Shopkeeper'),
('Chef'),
('Cook'),
('Waiter'),
('Tour Guide'),
('NGO Worker'),
('Civil Servant'),
('Police Officer'),
('Soldier'),
('Politician'),
('Lawyer'),
('Judge'),
('Priest / Monk'),
('Other');

insert into "Skill" (label) values
('Listening'),
('Teaching'),
('Facilitation'),
('Organizing'),
('Negotiation'),
('Teamwork'),
('Public Speaking'),
('Writing'),
('Storytelling'),
('Translation'),
('Design'),
('Drawing'),
('Singing'),
('Music Composition'),
('Cooking'),
('Crafting'),
('Gardening'),
('Farming'),
('Coding'),
('Problem Solving'),
('Critical Thinking'),
('Data Analysis'),
('Accounting'),
('Fundraising'),
('Marketing'),
('Photography'),
('Video Editing'),
('Research'),
('Mentoring'),
('Counseling'),
('Rapid Prototyping'),
('Carpentry'),
('Tailoring'),
('Legal Drafting'),
('Project Management'),
('Other');

insert into "Passion" (label) values
('Storytelling'),
('Building'),
('Gardening'),
('Traveling'),
('Teaching'),
('Learning'),
('Art'),
('Music'),
('Theatre'),
('Dance'),
('Language Learning'),
('Writing'),
('Photography'),
('Filmmaking'),
('Volunteering'),
('Meditation'),
('Yoga'),
('Cooking'),
('Design'),
('Technology'),
('Innovation'),
('Entrepreneurship'),
('Social Justice'),
('Community Radio'),
('Environmental Protection'),
('Animal Care'),
('Sports'),
('Adventure'),
('Research'),
('Craftsmanship'),
('Other');

insert into "Compassion" (label) values
('Children'),
('Elders'),
('Women Safety'),
('Climate'),
('Environment'),
('Forests'),
('Water Access'),
('Health Access'),
('Mental Health'),
('Education'),
('Poverty'),
('Unemployment'),
('Small Farmers'),
('Animal Welfare'),
('Justice for Migrant Workers'),
('Public Transport'),
('Open Governance'),
('Corruption Reform'),
('Peace & Nonviolence'),
('Clean Energy'),
('Cultural Revival'),
('Spiritual Growth'),
('Inclusivity'),
('Community Healing'),
('Disaster Relief'),
('Human Rights'),
('Other');

insert into "Vision" (label) values
('Village Learning Hub'),
('Community Kitchen'),
('Open Health Center'),
('Cooperative Farm'),
('Renewable Energy Network'),
('Local Artisan Market'),
('Circular Economy Bazaar'),
('Repair Café Network'),
('Ethical Business'),
('Digital Guthi Network'),
('Youth Skill Academy'),
('Women Leadership Hub'),
('Sustainable Tourism Circuit'),
('Zero-Waste Village'),
('Clean Water for All'),
('Organic School Meals'),
('Affordable Housing Movement'),
('Community Radio Station'),
('Public Transparency Portal'),
('Cultural Heritage Revival'),
('Forest Restoration Project'),
('Community-Owned Renewable Grid'),
('Other');


-- 4) Helpful indexes (by label search)
create index if not exists occupation_label_idx on "Occupation" using gin (to_tsvector('simple', label));
create index if not exists skill_label_idx on "Skill" using gin (to_tsvector('simple', label));
create index if not exists passion_label_idx on "Passion" using gin (to_tsvector('simple', label));
create index if not exists compassion_label_idx on "Compassion" using gin (to_tsvector('simple', label));
create index if not exists vision_label_idx on "Vision" using gin (to_tsvector('simple', label));
