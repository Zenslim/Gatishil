import Card from '@/components/Card';

export default function Home() {
  return (
    <div className="grid">
      <Card title="People">Directory of humans. Roles, reachouts, responsibility.</Card>
      <Card title="Orgs">Co-ops, teams, committees—who holds what mandate.</Card>
      <Card title="Projects">Work streams with owners, milestones, status.</Card>
      <Card title="Money">Transparent inflows/outflows. Proof over promises.</Card>
      <Card title="Knowledge">Docs, decisions, coordinates. Living, searchable.</Card>
      <Card title="Polls & Proposals">Gentle votes → clear mandates.</Card>
    </div>
  );
}