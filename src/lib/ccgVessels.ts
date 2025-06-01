
// src/lib/ccgVessels.ts

export interface CCGVessel {
  value: string; // Typically the vessel name, used as the unique ID for selection
  label: string; // The display name for the vessel
}

export const ccgVesselList: CCGVessel[] = [
  { value: "CCGS Amundsen", label: "CCGS Amundsen" },
  { value: "CCGS Ann Harvey", label: "CCGS Ann Harvey" },
  { value: "CCGS Bartlett", label: "CCGS Bartlett" },
  { value: "CCGS Cape Roger", label: "CCGS Cape Roger" },
  { value: "CCGS Cygnus", label: "CCGS Cygnus" },
  { value: "CCGS Des Groseilliers", label: "CCGS Des Groseilliers" },
  { value: "CCGS Edward Cornwallis", label: "CCGS Edward Cornwallis" }, // Note: May be renamed
  { value: "CCGS George R. Pearkes", label: "CCGS George R. Pearkes" },
  { value: "CCGS Gordon Reid", label: "CCGS Gordon Reid" },
  { value: "CCGS Griffon", label: "CCGS Griffon" },
  { value: "CCGS Henry Larsen", label: "CCGS Henry Larsen" },
  { value: "CCGS Hudson", label: "CCGS Hudson" }, // Note: Decommissioned, but for example
  { value: "CCGS Jean Goodwill", label: "CCGS Jean Goodwill" },
  { value: "CCGS John Cabot", label: "CCGS John Cabot" },
  { value: "CCGS John G. Diefenbaker", label: "CCGS John G. Diefenbaker" }, // Note: Future
  { value: "CCGS Kelso", label: "CCGS Kelso" },
  { value: "CCGS Labrador", label: "CCGS Labrador" }, // Note: Historical, for example
  { value: "CCGS Louis S. St-Laurent", label: "CCGS Louis S. St-Laurent" },
  { value: "CCGS Martha L. Black", label: "CCGS Martha L. Black" },
  { value: "CCGS Pierre Radisson", label: "CCGS Pierre Radisson" },
  { value: "CCGS Samuel Risley", label: "CCGS Samuel Risley" },
  { value: "CCGS Sir John Franklin", label: "CCGS Sir John Franklin" },
  { value: "CCGS Sir Wilfrid Laurier", label: "CCGS Sir Wilfrid Laurier" },
  { value: "CCGS Terry Fox", label: "CCGS Terry Fox" },
  { value: "CCGS Tufts", label: "CCGS Tufts" },
  { value: "CCGS Vincent Massey", label: "CCGS Vincent Massey" },
  // Add more vessels as needed for a more comprehensive list
];

// You can add a function here to fetch/update this list from a source in a real app
