-- Minimal seed

insert into roles (name, description) values
  ('admin','Platform administrator with full access')
on conflict (name) do nothing;

insert into permissions (name, description) values
  ('manage_projects','Create and update projects'),
  ('manage_money','Create ledger entries'),
  ('manage_knowledge','Create docs'),
  ('manage_polls','Create polls')
on conflict (name) do nothing;

insert into orgs (name, org_type, areas_of_work, website, tags)
values ('ZenSara Cooperative','co-op', array['agroforestry','wellness'], 'https://example.org', array['flagship'])
on conflict do nothing;

insert into treasury_accounts (name, currency) values ('Main NPR Cash','NPR')
on conflict do nothing;

insert into projects (title, description, status, budget, tags)
values ('Ward-01 Water Harvesting', 'Swales, ponds, check-dams', 'active', 1500000, array['water','earthworks'])
on conflict do nothing;

insert into knowledge_folders (name) values ('Root Folder')
on conflict do nothing;

insert into knowledge_docs (title, body, doc_type, visibility, tags)
values ('Field SOP v1', 'Start with safety briefing...', 'md', 'internal', array['sop','field'])
on conflict do nothing;

insert into polls (title, body) values ('Where to prioritize next?', 'Choose one');

insert into poll_options (poll_id, label, position)
select id, x.label, x.pos
from polls, (values ('Water',1),('Nursery',2),('Training',3)) as x(label,pos)
where title='Where to prioritize next?';
