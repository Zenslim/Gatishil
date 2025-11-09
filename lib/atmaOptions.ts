// lib/atmaOptions.ts — Five-table loader (Occupation, Skill, Passion, Compassion, Vision)
// Works with AtmaDisha.jsx — dropdowns load from Supabase or fallback to bundled lists.

export const bundledOptions = {
  occupation: [
    "Farmer","Teacher","Student","Engineer","Doctor","Nurse","Healer","Craftsperson","Artist","Musician",
    "Writer","Journalist","Photographer","Filmmaker","Designer","Architect","Social Worker","Volunteer",
    "Entrepreneur","Researcher","Scientist","Programmer","Data Analyst","Mechanic","Driver","Tailor","Weaver",
    "Mason","Carpenter","Electrician","Plumber","Security Guard","Delivery Rider","Shopkeeper","Chef","Cook",
    "Waiter","Tour Guide","NGO Worker","Civil Servant","Police Officer","Soldier","Politician","Lawyer","Judge",
    "Priest / Monk","Other"
  ],
  skill: [
    "Listening","Teaching","Facilitation","Organizing","Negotiation","Teamwork","Public Speaking","Writing","Storytelling",
    "Translation","Design","Drawing","Singing","Music Composition","Cooking","Crafting","Gardening","Farming","Coding",
    "Problem Solving","Critical Thinking","Data Analysis","Accounting","Fundraising","Marketing","Photography","Video Editing",
    "Research","Mentoring","Counseling","Rapid Prototyping","Carpentry","Tailoring","Legal Drafting","Project Management","Other"
  ],
  passion: [
    "Storytelling","Building","Gardening","Traveling","Teaching","Learning","Art","Music","Theatre","Dance","Language Learning",
    "Writing","Photography","Filmmaking","Volunteering","Meditation","Yoga","Cooking","Design","Technology","Innovation",
    "Entrepreneurship","Social Justice","Community Radio","Environmental Protection","Animal Care","Sports","Adventure","Research",
    "Craftsmanship","Other"
  ],
  compassion: [
    "Children","Elders","Women Safety","Climate","Environment","Forests","Water Access","Health Access","Mental Health","Education",
    "Poverty","Unemployment","Small Farmers","Animal Welfare","Justice for Migrant Workers","Public Transport","Open Governance",
    "Corruption Reform","Peace & Nonviolence","Clean Energy","Cultural Revival","Spiritual Growth","Inclusivity","Community Healing",
    "Disaster Relief","Human Rights","Other"
  ],
  vision: [
    "Village Learning Hub","Community Kitchen","Open Health Center","Cooperative Farm","Renewable Energy Network",
    "Local Artisan Market","Circular Economy Bazaar","Repair Café Network","Ethical Business","Digital Guthi Network",
    "Youth Skill Academy","Women Leadership Hub","Sustainable Tourism Circuit","Zero-Waste Village","Clean Water for All",
    "Organic School Meals","Affordable Housing Movement","Community Radio Station","Public Transparency Portal",
    "Cultural Heritage Revival","Forest Restoration Project","Community-Owned Renewable Grid","Other"
  ]
};

type Lists = {
  occupation: string[];
  skill: string[];
  passion: string[];
  compassion: string[];
  vision: string[];
};

// Normalize Supabase rows
function normalize(rows: any[]): string[] {
  return (rows || [])
    .map((r: any) => (typeof r?.label === "string" ? r.label.trim() : ""))
    .filter(Boolean);
}

// Loader for Atma Disha dropdowns
export async function loadOptions(supabase: any): Promise<Lists> {
  // Fallback if Supabase not available
  if (!supabase) return { ...bundledOptions };

  try {
    const tables = ["Occupation", "Skill", "Passion", "Compassion", "Vision"] as const;

    const results = await Promise.all(
      tables.map((t) => supabase.from(t).select("label").order("label", { ascending: true }))
    );

    const [occ, skl, pas, com, vis] = results.map((r: any) => normalize(r?.data));

    const lists: Lists = {
      occupation: occ.length ? occ : bundledOptions.occupation,
      skill: skl.length ? skl : bundledOptions.skill,
      passion: pas.length ? pas : bundledOptions.passion,
      compassion: com.length ? com : bundledOptions.compassion,
      vision: vis.length ? vis : bundledOptions.vision
    };

    return lists;
  } catch (e) {
    return { ...bundledOptions };
  }
}
