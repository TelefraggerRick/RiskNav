
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { RiskAssessment, RiskAssessmentStatus, VesselRegion, VesselDepartment } from '@/lib/types';
import { ALL_VESSEL_REGIONS } from '@/lib/types';
// import RiskAssessmentCard from '@/components/risk-assessments/RiskAssessmentCard'; // Temporarily removed
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card'; // Ensured CardTitle and CardDescription are imported
import { AlertTriangle, Filter, ArrowUpDown, Search, X, ListFilter, Ship as ShipIcon, Globe as GlobeIcon, Package, Cog, Anchor, Info, Loader2 } from 'lucide-react';
import { format, parseISO, isValid, isBefore, isEqual, isAfter } from 'date-fns';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getAllAssessmentsFromDB } from '@/lib/firestoreService';
import { toast } from 'sonner';


type SortKey = 'submissionDate' | 'status' | 'vesselName' | 'lastModified' | 'region';
type SortDirection = 'asc' | 'desc';

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

const departmentLegendItems: { department: VesselDepartment; colorClass: string; icon: React.ElementType; translations: { en: string; fr: string} }[] = [
  { department: 'Navigation', colorClass: 'bg-blue-50 border-blue-200', icon: GlobeIcon, translations: { en: 'Navigation', fr: 'Navigation'} },
  { department: 'Deck', colorClass: 'bg-slate-50 border-slate-200', icon: Anchor, translations: { en: 'Deck', fr: 'Pont'} },
  { department: 'Engine Room', colorClass: 'bg-purple-50 border-purple-200', icon: Cog, translations: { en: 'Engine Room', fr: 'Salle des machines'} },
  { department: 'Logistics', colorClass: 'bg-green-50 border-green-200', icon: Package, translations: { en: 'Logistics', fr: 'Logistique'} },
  { department: 'Other', colorClass: 'bg-orange-50 border-orange-200', icon: Info, translations: { en: 'Other', fr: 'Autre'} },
];


export default function DashboardPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<RiskAssessmentStatus[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<VesselRegion[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('lastModified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { getTranslation, currentLanguage } = useLanguage();

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
    patrolLabel: { en: "Patrol:", fr: "Patrouille :" },
    generalAssessmentsLabel: { en: "General Assessments", fr: "Évaluations générales" },
    departmentLegendTitle: { en: "Department Color Legend", fr: "Légende des couleurs par département" },
    loadingErrorTitle: { en: "Error Loading Assessments", fr: "Erreur de chargement des évaluations"},
    loadingErrorDesc: { en: "Could not fetch risk assessments from the database. Please try again later.", fr: "Impossible de récupérer les évaluations des risques de la base de données. Veuillez réessayer plus tard."}
  };

  const loadAssessments = useCallback(async () => {
    console.log("DashboardPage: loadAssessments CALLED. Setting isLoading to true.");
    setIsLoading(true);
    try {
      console.log("DashboardPage: loadAssessments - BEFORE calling getAllAssessmentsFromDB.");
      const data = await getAllAssessmentsFromDB();
      console.log(`DashboardPage: loadAssessments - getAllAssessmentsFromDB SUCCEEDED, returned ${data.length} assessments.`);
      setAssessments(data);
    } catch (error) {
      console.error("DashboardPage: loadAssessments - getAllAssessmentsFromDB FAILED or error during setAssessments:", error);
      toast.error(getTranslation(T.loadingErrorTitle), {
        description: getTranslation(T.loadingErrorDesc),
      });
      setAssessments([]);
    } finally {
      console.log("DashboardPage: loadAssessments - FINALLY block. Setting isLoading to false.");
      setIsLoading(false);
    }
  }, [getTranslation, T.loadingErrorTitle, T.loadingErrorDesc]); // Keep T.x.y as deps or ensure T is stable reference

  useEffect(() => {
    console.log("DashboardPage: Initial useEffect to call loadAssessments.");
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

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc'); 
    }
  }, [sortKey]);

  const currentSortLabel = sortOptions.find(opt => opt.value === sortKey)?.[currentLanguage === 'fr' ? 'fr_label' : 'label'] || getTranslation(T.sort);

  const statusFilterLabel = selectedStatuses.length === 0 || selectedStatuses.length === ALL_STATUSES.length
    ? getTranslation(T.allStatuses)
    : `${selectedStatuses.length} ${getTranslation(T.selected)}`;

  const regionFilterLabel = selectedRegions.length === 0 || selectedRegions.length === ALL_VESSEL_REGIONS.length
    ? getTranslation(T.allRegions)
    : `${selectedRegions.length} ${getTranslation(T.selected)}`;


  if (isLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-xl text-muted-foreground">Loading assessments...</p>
        </div>
    );
  }

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
                  {status}
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
                  <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{getTranslation(T.filterByRegion)}</span>
                </div>
                {selectedRegions.length > 0 && <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">{regionFilterLabel}</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{getTranslation(T.filterByRegion)}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_VESSEL_REGIONS.map(region => (
                <DropdownMenuCheckboxItem
                  key={region}
                  checked={selectedRegions.includes(region)}
                  onCheckedChange={() => handleRegionChange(region)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {region}
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

        <div className="mt-4 pt-3 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{getTranslation(T.departmentLegendTitle)}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
            {departmentLegendItems.map(item => {
                const Icon = item.icon;
                return (
                <div key={item.department} className="flex items-center gap-2 text-xs">
                    <span className={cn("w-3 h-3 rounded-sm inline-block border", item.colorClass)}></span>
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span>{getTranslation(item.translations)}</span>
                </div>
                );
            })}
            </div>
        </div>
      </Card>

      {/* Simplified rendering for diagnostics */}
      <Card className="p-6">
        <CardTitle>Assessments Loaded</CardTitle>
        <CardDescription>
          Number of assessments fetched: {assessments.length}
        </CardDescription>
        {assessments.length === 0 && !isLoading && (
            <div className="mt-4">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">{getTranslation(T.noAssessmentsFound)}</h2>
                <p className="text-muted-foreground">
                {getTranslation(T.noMatchFilters)}
                </p>
            </div>
        )}
      </Card>

      {/* 
      // Temporarily removed complex rendering
      {groupedAndSortedAssessments.length > 0 ? (
        <div className="space-y-8">
          {groupedAndSortedAssessments.map(([groupKey, patrolAssessments]) => {
            const displayTitle = getGroupDisplayTitle(patrolAssessments);
            const groupId = displayTitle.replace(/\s+/g, '-').toLowerCase();

            return (
              <section key={groupKey} aria-labelledby={`patrol-group-${groupId}`}>
                <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                  <ShipIcon className="h-6 w-6 text-secondary" />
                  <h2 id={`patrol-group-${groupId}`} className="text-xl sm:text-2xl font-semibold text-secondary">
                    {displayTitle}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {patrolAssessments.map(assessment => (
                    <RiskAssessmentCard 
                        key={assessment.id} 
                        assessment={assessment}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <Card className="p-10 text-center shadow-sm rounded-lg">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{getTranslation(T.noAssessmentsFound)}</h2>
            <p className="text-muted-foreground">
              {getTranslation(T.noMatchFilters)}
            </p>
          </Card>
        )
      )} 
      */}
    </div>
  );
}
    

    
