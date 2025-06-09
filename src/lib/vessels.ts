
// src/lib/ccgVessels.ts

export interface CCGVessel {
  value: string; // Typically the vessel name, used as the unique ID for selection
  label: string; // The display name for the vessel
}

export const ccgVesselList: CCGVessel[] = [
  { value: "MV Stellar Voyager", label: "MV Stellar Voyager" },
  { value: "SV Ocean Whisper", label: "SV Ocean Whisper" },
  { value: "FV Neptune's Bounty", label: "FV Neptune's Bounty" },
  { value: "RV Tide Explorer", label: "RV Tide Explorer" },
  { value: "MV Coastal Pioneer", label: "MV Coastal Pioneer" },
  { value: "SV Sea Serpent", label: "SV Sea Serpent" },
  { value: "FV Arctic Star", label: "FV Arctic Star" },
  { value: "RV Island Guardian", label: "RV Island Guardian" },
  { value: "MV Atlantic Drifter", label: "MV Atlantic Drifter" },
  { value: "SV Pacific Wanderer", label: "SV Pacific Wanderer" },
  { value: "FV Northern Light", label: "FV Northern Light" },
  { value: "RV Deepwater Researcher", label: "RV Deepwater Researcher" },
  { value: "MV Harbor Master", label: "MV Harbor Master" },
  { value: "SV Coral Dancer", label: "SV Coral Dancer" },
  { value: "FV Southern Cross", label: "FV Southern Cross" },
  { value: "RV Bay Surveyor", label: "RV Bay Surveyor" },
  { value: "MV River Runner", label: "MV River Runner" },
  { value: "SV Aurora Chaser", label: "SV Aurora Chaser" },
  { value: "FV Polar King", label: "FV Polar King" },
  { value: "RV Coastal Sentinel", label: "RV Coastal Sentinel" },
  { value: "MV Frontier Spirit", label: "MV Frontier Spirit" },
  { value: "SV Marina Dream", label: "SV Marina Dream" },
  { value: "FV Storm Petrel", label: "FV Storm Petrel" },
  { value: "RV Maritime Scout", label: "RV Maritime Scout" },
  { value: "MV Port Authority", label: "MV Port Authority" },
  { value: "SV Golden Horizon", label: "SV Golden Horizon" },
  { value: "FV Blue Fin", label: "FV Blue Fin" },
  { value: "RV Channel Navigator", label: "RV Channel Navigator" },
  { value: "MV Lake Freighter Alpha", label: "MV Lake Freighter Alpha" },
  { value: "SV Island Hopper", label: "SV Island Hopper" },
  { value: "FV Arctic Prowler", label: "FV Arctic Prowler" },
  { value: "RV Oceanic Observer", label: "RV Oceanic Observer" },
  { value: "MV Sea Stallion", label: "MV Sea Stallion" },
  { value: "SV Wind Runner", label: "SV Wind Runner" },
  { value: "FV Coastal Harvester", label: "FV Coastal Harvester" },
  { value: "RV Pathfinder Pro", label: "RV Pathfinder Pro" },
  { value: "MV Delta Mariner", label: "MV Delta Mariner" },
  { value: "SV Tropical Breeze", label: "SV Tropical Breeze" },
  { value: "FV Ice Hunter", label: "FV Ice Hunter" },
  { value: "RV Estuary Guardian", label: "RV Estuary Guardian" },
  { value: "MV Polar Expedition", label: "MV Polar Expedition" },
  { value: "SV Star of the Sea", label: "SV Star of the Sea" },
  { value: "FV Deep Sea Angler", label: "FV Deep Sea Angler" },
  { value: "RV Marine Investigator", label: "RV Marine Investigator" },
  { value: "MV Coastal Trader", label: "MV Coastal Trader" },
  { value: "SV Ocean Drifter", label: "SV Ocean Drifter" },
  { value: "FV Arctic Voyager", label: "FV Arctic Voyager" },
  { value: "RV Island Explorer", label: "RV Island Explorer" },
  { value: "MV Atlantic Pioneer", label: "MV Atlantic Pioneer" },
  { value: "SV Pacific Drifter", label: "SV Pacific Drifter" },
  { value: "Other Vessel", label: "Other Vessel (Specify in Voyage Details)"} // Allows for custom entry
];

// You can add a function here to fetch/update this list from a source in a real app
