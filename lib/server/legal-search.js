const MAURITIUS_PRECEDENTS = [
  { id: "2024 SCJ 12", title: "MRA vs Global Tech", area: "Tax Substance", summary: "Establishing physical presence requirements for GBL entities." },
  { id: "2025 SCJ 44", title: "State vs Fintech Ltd", area: "AML/CFT", summary: "Automated compliance logs accepted as primary evidence." },
  { id: "2026 SCJ 101", title: "Port Louis Port Authority", area: "Maritime Law", summary: "Digital bill of lading precedents for smart-contract trade." }
];

export default async function handler(req, res) {
  const query = (req.query.query || "").toLowerCase();
  const results = MAURITIUS_PRECEDENTS.filter(p => 
    p.title.toLowerCase().includes(query) || p.area.toLowerCase().includes(query)
  );
  
  return res.status(200).json(results);
}
