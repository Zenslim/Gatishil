# HR Upgrade — One Step

1) Upload this zip to your repo root (overwrite files).  
2) In Supabase → SQL Editor, run `sql/hr_upgrade.sql`.  
3) Visit `/api/hr-stats` to confirm counts.

This schema covers: personal info, position, education, background/history, profile links, affiliated orgs/groups, family relations, circles, socials, non-structured info, notes, grading (overall/project/third-party), projects involved, vetting (templates + outcomes), categories (admin staff / members / volunteers / professionals / person of interest), fees/subscriptions, compensation, and emergency contacts.

RLS: open read, authenticated write (same pattern as People). Adjust later if needed.
