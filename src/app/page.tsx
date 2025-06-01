
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { RiskAssessment, RiskAssessmentStatus, VesselRegion } from '@/lib/types';
import { mockRiskAssessments } from '@/lib/mockData'; 
import RiskAssessmentCard from '@/components/risk-assessments/RiskAssessmentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Filter, ArrowUpDown, Search, X, ListFilter, Ship as ShipIcon, Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext'; // Added

type SortKey = 'submissionDate' | 'status' | 'vesselName' | 'lastModified' | 'region';
type SortDirection = 'asc' | 'desc';

const LOCAL_STORAGE_KEY = 'riskAssessmentsData';

const sortOptions: { value: SortKey; label: string; fr_label: string }[] = [
  { value: 'submissionDate', label: 'Submission Date', fr_label: 'Date de soumission' },
  { value: 'lastModified', label: 'Last Modified', fr_label: 'Dernière modification' },
  { value: 'status', label: 'Status', fr_label: 'Statut' },
  { value: 'vesselName', label: 'Vessel Name', fr_label: 'Nom du navire' },
  { value: 'region', label: 'Region', fr_label: 'Région' },
];

const ALL_STATUSES: RiskAssessmentStatus[] = [
  'Draft', 
  'Pending Crewing Standards and Oversight', 
  'Pending Senior Director', 
  'Pending Director General', 
  'Needs Information', 
  'Approved', 
  'Rejected'
];

const ALL_REGIONS: VesselRegion[] = ['Atlantic', 'Central', 'Western', 'Arctic'];


export default function DashboardPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<RiskAssessmentStatus[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<VesselRegion[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('lastModified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { getTranslation, currentLanguage } = useLanguage(); // Added

  const T = {
    dashboardTitle: { en: "Risk Assessments Dashboard", fr: "Tableau de bord des évaluations des risques" },
    searchPlaceholder: { en: "Search assessments...", fr: "Rechercher des évaluations..." },
    clearSearch: { en: "Clear search", fr: "Effacer la recherche" },
    filterByStatus: { en: "Filter by Status", fr: "Filtrer par statut" },
    filterByRegion: { en: "Filter by Region", fr: "Filtrer par région" },
    allStatuses: { en: "All Statuses", fr: "Tous les statuts" },
    allRegions: { en: "All Regions", fr: "Toutes les régions" },
    selected: { en: "Selected", fr: "Sélectionné(s)" },
    sortBy: { en: "Sort by", fr: "Trier par" },
    sort: { en: "Sort", fr: "Trier" },
    asc: { en: "Asc", fr: "Asc" },
    desc: { en: "Desc", fr: "Desc" },
    noAssessmentsFound: { en: "No Assessments Found", fr: "Aucune évaluation trouvée" },
    noMatchFilters: { en: "No risk assessments match your current filters. Try adjusting your search or filter criteria, or create a new assessment.", fr: "Aucune évaluation des risques ne correspond à vos filtres actuels. Essayez d'ajuster vos critères de recherche ou de filtrage, ou créez une nouvelle évaluation." },
    clearStatusFilters: { en: "Clear Status Filters", fr: "Effacer les filtres de statut" },
    clearRegionFilters: { en: "Clear Region Filters", fr: "Effacer les filtres de région" },
  };


  const loadAssessments = useCallback(() => {
    const baseAssessments = [...mockRiskAssessments];
    let storedAssessments: RiskAssessment[] = [];
    if (typeof window !== 'undefined') {
        const storedAssessmentsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        storedAssessments = storedAssessmentsRaw ? JSON.parse(storedAssessmentsRaw) : [];
    }

    const combinedMap = new Map<string, RiskAssessment>();

    baseAssessments.forEach(assessment => {
        combinedMap.set(assessment.id, {
            ...assessment,
            region: assessment.region ? assessment.region as VesselRegion : undefined
        });
    });

    storedAssessments.forEach(storedAssessment => {
        combinedMap.set(storedAssessment.id, {
            ...storedAssessment,
            region: storedAssessment.region ? storedAssessment.region as VesselRegion : undefined
        });
    });
    
    setAssessments(Array.from(combinedMap.values()));
  }, []);


  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);


  const handleStatusChange = (status: RiskAssessmentStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleRegionChange = (region: VesselRegion) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const groupedAndSortedAssessments = useMemo(() => {
    let filtered = assessments;

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(assessment =>
        assessment.vesselName.toLowerCase().includes(lowerSearchTerm) ||
        assessment.referenceNumber.toLowerCase().includes(lowerSearchTerm) ||
        (assessment.reasonForRequest && assessment.reasonForRequest.toLowerCase().includes(lowerSearchTerm)) ||
        (assessment.region && assessment.region.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(assessment => selectedStatuses.includes(assessment.status));
    }
    
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(assessment => assessment.region && selectedRegions.includes(assessment.region));
    }


    const sortedAssessments = [...filtered].sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case 'submissionDate':
          valA = a.submissionTimestamp;
          valB = b.submissionTimestamp;
          break;
        case 'lastModified':
            valA = a.lastModifiedTimestamp;
            valB = b.lastModifiedTimestamp;
            break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'vesselName':
          valA = a.vesselName.toLowerCase();
          valB = b.vesselName.toLowerCase();
          break;
        case 'region':
          valA = a.region || '';
          valB = b.region || '';
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      if (sortKey !== 'submissionDate') {
        if (a.submissionTimestamp < b.submissionTimestamp) return 1; 
        if (a.submissionTimestamp > b.submissionTimestamp) return -1;
      }
      return 0;
    });
    
    const groupedByVessel: Record<string, RiskAssessment[]> = sortedAssessments.reduce((acc, assessment) => {
      const key = assessment.vesselName;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(assessment);
      return acc;
    }, {} as Record<string, RiskAssessment[]>);

    const sortedVesselGroups = Object.entries(groupedByVessel).sort(([vesselA], [vesselB]) => 
      vesselA.localeCompare(vesselB)
    );
    
    return sortedVesselGroups;

  }, [assessments, searchTerm, selectedStatuses, selectedRegions, sortKey, sortDirection]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc'); 
    }
  }, [sortKey]);

  
  const currentSortLabel = sortOptions.find(opt => opt.value === sortKey)?.[currentLanguage === 'fr' ? 'fr_label' : 'label'] || getTranslation(T.sort);
  
  const statusFilterLabel = selectedStatuses.length === 0 || selectedStatuses.length === ALL_STATUSES.length
    ? getTranslation(T.allStatuses)
    : `${selectedStatuses.length} ${getTranslation(T.selected)}`;

  const regionFilterLabel = selectedRegions.length === 0 || selectedRegions.length === ALL_REGIONS.length
    ? getTranslation(T.allRegions)
    : `${selectedRegions.length} ${getTranslation(T.selected)}`;


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">{getTranslation(T.dashboardTitle)}</h1>
      </div>

      <Card className="p-4 sm:p-6 shadow-sm rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={getTranslation(T.searchPlaceholder)}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
              aria-label={getTranslation(T.searchPlaceholder)}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
                aria-label={getTranslation(T.clearSearch)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex justify-between items-center text-sm" aria-label={getTranslation(T.filterByStatus)}>
                 <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" />
                  <span>{getTranslation(T.filterByStatus)}</span>
                </div>
                {selectedStatuses.length > 0 && <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">{statusFilterLabel}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{getTranslation(T.filterByStatus)}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_STATUSES.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={() => handleStatusChange(status)}
                  onSelect={(e) => e.preventDefault()} 
                >
                  {status} {/* Status values are usually not translated or handled by i18n keys */}
                </DropdownMenuCheckboxItem>
              ))}
               <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSelectedStatuses([])} disabled={selectedStatuses.length === 0}>
                  {getTranslation(T.clearStatusFilters)}
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex justify-between items-center text-sm" aria-label={getTranslation(T.filterByRegion)}>
                 <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{getTranslation(T.filterByRegion)}</span>
                </div>
                {selectedRegions.length > 0 && <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">{regionFilterLabel}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{getTranslation(T.filterByRegion)}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_REGIONS.map(region => (
                <DropdownMenuCheckboxItem
                  key={region}
                  checked={selectedRegions.includes(region)}
                  onCheckedChange={() => handleRegionChange(region)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {region} {/* Region values are usually not translated or handled by i18n keys */}
                </DropdownMenuCheckboxItem>
              ))}
               <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSelectedRegions([])} disabled={selectedRegions.length === 0}>
                   {getTranslation(T.clearRegionFilters)}
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex justify-between items-center text-sm" aria-label={getTranslation(T.sortBy)}>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span>{currentSortLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground">{sortDirection === 'asc' ? getTranslation(T.asc) : getTranslation(T.desc)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{getTranslation(T.sortBy)}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map(opt => (
                <DropdownMenuItem key={opt.value} onClick={() => handleSort(opt.value)}>
                  {currentLanguage === 'fr' ? opt.fr_label : opt.label}
                  {sortKey === opt.value && <ArrowUpDown className="ml-auto h-4 w-4 opacity-50" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {groupedAndSortedAssessments.length > 0 ? (
        <div className="space-y-8">
          {groupedAndSortedAssessments.map(([vesselName, vesselAssessments]) => (
            <section key={vesselName} aria-labelledby={`vessel-group-${vesselName.replace(/\s+/g, '-').toLowerCase()}`}>
              <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                <ShipIcon className="h-6 w-6 text-secondary" />
                <h2 id={`vessel-group-${vesselName.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl sm:text-2xl font-semibold text-secondary">
                  {vesselName}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vesselAssessments.map(assessment => (
                  <RiskAssessmentCard key={assessment.id} assessment={assessment} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center shadow-sm rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{getTranslation(T.noAssessmentsFound)}</h2>
          <p className="text-muted-foreground">
            {getTranslation(T.noMatchFilters)}
          </p>
        </Card>
      )}
    </div>
  );
}
