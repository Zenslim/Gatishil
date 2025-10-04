// lib/atmaOptions.ts
// Fetch option lists from Supabase (table: atma_options).
// Fallback to bundled rich lists if table missing.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AtmaKey = "occupation" | "skill" | "passion" | "compassion" | "vision";
export type OptionsMap = Record<AtmaKey, string[]>;

export const bundledOptions: OptionsMap = {
  occupation: [
    "Farmer","Teacher","Student","Craftsperson","Engineer","Healer","Merchant","Homemaker","Driver","Laborer","Nurse",
    "Doctor","Software Engineer","Designer","Artist","Musician","Police","Army","Civil Servant","Entrepreneur",
    "Volunteer","Journalist","Lawyer","Social Worker","Accountant","Architect","Plumber","Electrician","Mechanic",
    "Photographer","Filmmaker","Product Manager","Data Analyst","Researcher","Shopkeeper","Tour Guide","Chef","Barista",
    "Fisher","Forester","Tailor","Weaver","Mason","Security Guard","Delivery Rider","Other"
  ],
  skill: [
    "Listening","Teaching","Organizing","Design","Coding","Cooking","Negotiation","Caretaking","Writing","Public Speaking",
    "Photography","Carpentry","Farming","Healing","Finance","Sales","Research","Strategy","Community Building",
    "Facilitation","Mentoring","Conflict Resolution","Event Planning","Grant Writing","UX Research","Storytelling",
    "Marketing","Social Media","Data Analysis","Translation","Fundraising","Rapid Prototyping","Legal Drafting","Other"
  ],
  passion: [
    "Storytelling","Building","Gardening","Art","Music","Research","Entrepreneurship","Volunteering","Meditation","Teaching",
    "Coding Projects","Sports & Movement","Reading","Travel","Journalism","Open Source","Climate Action","Poetry",
    "Photography Walks","Hiking","Mental Health Advocacy","Community Radio","Theatre","Dance","Crafts","Cooking Experiments",
    "Language Learning","Local History","Other"
  ],
  compassion: [
    "Children","Elders","Climate","Health Access","Corruption","Education","Poverty","Women Safety","Animal Care",
    "Disability Inclusion","Mental Health","Rural Access","Clean Water","Fair Wages","Digital Literacy","Waste Management",
    "Road Safety","Small Farmers","Public Transport","Open Governance","Justice for Migrant Workers","Other"
  ],
  vision: [
    "Village Learning Hub","Clean Water for All","Cooperative Farm","Open Health Center","Ethical Business","Art Collective",
    "Research Lab","Forest Restoration","Makerspace","Community Kitchen","Youth Club","Local Transport Coop",
    "Open Data for Municipality","Repair Café Network","Community Garden Corridors","Citizen Journalism Desk",
    "Women-led Enterprise Fund","Skilling Bootcamps","Senior Companionship Program","Accessible Playgrounds",
    "Neighbourhood Disaster Team","Circular Economy Bazaar","Other"
  ],
};

export async function loadOptions(supabase: SupabaseClient | null): Promise<OptionsMap> {
  if (!supabase) return bundledOptions;
  try {
    const { data, error } = await supabase.from("atma_options").select("key,label").order("label");
    if (error || !data) return bundledOptions;
    const map: OptionsMap = { occupation: [], skill: [], passion: [], compassion: [], vision: [] };
    for (const row of data) {
      const k = row.key as AtmaKey;
      if (map[k] && typeof row.label === "string") map[k].push(row.label);
    }
    // Ensure non-empty
    (Object.keys(map) as AtmaKey[]).forEach(k => { if (map[k].length === 0) map[k] = bundledOptions[k]; });
    return map;
  } catch {
    return bundledOptions;
  }
}
