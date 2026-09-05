// Subject registry — maps a URL slug to the vault folder name and display info.
// Add a new subject here when a new course folder appears in the vault.
export type Subject = {
  slug: string;
  code: string;
  name: string;
  vaultFolder: string;
};

export const SUBJECTS: Subject[] = [
  {
    slug: "cdp",
    code: "CDP",
    name: "Communication Design Process",
    vaultFolder: "Communication_design_process",
  },
  {
    slug: "dcd",
    code: "DCD",
    name: "Digital Communication Design",
    vaultFolder: "Digital_communication_design",
  },
  {
    slug: "dfd",
    code: "DFD",
    name: "Digital Fashion Design",
    vaultFolder: "Digital_Fashion_design",
  },
  {
    slug: "dp",
    code: "DP",
    name: "Design Prototyping",
    vaultFolder: "Design_prototyping",
  },
];

export function getSubject(slug: string): Subject | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}
