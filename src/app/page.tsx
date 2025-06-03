
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { RiskAssessment, RiskAssessmentStatus, VesselRegion, VesselDepartment } from '@/lib/types';
import { ALL_VESSEL_REGIONS } from '@/lib/types';
import RiskAssessmentCard from '@/components/risk-assessments/RiskAssessmentCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Filter, ArrowUpDown, Search, X, ListFilter, Ship as ShipIcon, Globe as GlobeIcon, Package, Cog, Anchor, Info, Loader2, CalendarClock } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
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


type SortKey = 'submissionDate' | 'status' | 'vesselName' | 'lastModified' | 'region' | 'patrolStartDate';
type SortDirection = 'asc' | 'desc';

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
  generalAssessmentsLabel: { en: "General Assessments (No Specified Patrol Dates)", fr: "Évaluations générales (Aucune date de patrouille spécifiée)" },
  departmentLegendTitle: { en: "Department Color Legend", fr: "Légende des couleurs par département" },
  loadingErrorTitle: { en: "Error Loading Assessments", fr: "Erreur de chargement des évaluations"},
  loadingErrorDesc: { en: "Could not fetch risk assessments from the database. Please try again later.", fr: "Impossible de récupérer les évaluations des risques de la base de données. Veuillez réessayer plus tard."},
  clearStatusFilters: { en: "Clear Status Filters", fr: "Effacer les filtres de statut" },
  clearRegionFilters: { en: "Clear Region Filters", fr: "Effacer les filtres de région" },
  patrolStartDateSort: { en: "Patrol Start Date", fr: "Date de début de patrouille" },
  to: { en: "to", fr: "au" }, // Added missing translation
};

const sortOptions: { value: SortKey; labelKey: keyof typeof T; staticLabel?: string; staticFrLabel?: string }[] = [
  { value: 'submissionDate', staticLabel: 'Submission Date', staticFrLabel: 'Date de soumission' },
  { value: 'lastModified', staticLabel: 'Last Modified', staticFrLabel: 'Dernière modification' },
  { value: 'patrolStartDate', labelKey: 'patrolStartDateSort' },
  { value: 'status', staticLabel: 'Status', staticFrLabel: 'Statut' },
  { value: 'vesselName', staticLabel: 'Vessel Name', staticFrLabel: 'Nom du navire' },
  { value: 'region', staticLabel: 'Region', staticFrLabel: 'Région' },
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
  }, [getTranslation]);

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
      setSortDirection('desc'); // Default to descending for new sort key
    }
  }, [sortKey]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter(assessment => {
      const searchTermMatch = searchTerm.trim() === '' ||
        assessment.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assessment.imoNumber && assessment.imoNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (assessment.maritimeExemptionNumber && assessment.maritimeExemptionNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        assessment.reasonForRequest.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(assessment.status);
      const regionMatch = selectedRegions.length === 0 || (assessment.region && selectedRegions.includes(assessment.region));

      return searchTermMatch && statusMatch && regionMatch;
    });
  }, [assessments, searchTerm, selectedStatuses, selectedRegions]);

  const groupedAndSortedAssessments = useMemo(() => {
    const patrolAssessments = filteredAssessments.filter(a => a.patrolStartDate && isValid(parseISO(a.patrolStartDate)));
    const generalAssessments = filteredAssessments.filter(a => !a.patrolStartDate || !isValid(parseISO(a.patrolStartDate)));
    const finalResult: [string, RiskAssessment[]][] = [];

    // Sort generalAssessments based on the user's current selection
    // (or fallback if sorting by patrolStartDate, which doesn't apply to general)
    const effectiveSortKeyForGeneral = sortKey === 'patrolStartDate' ? 'lastModified' : sortKey;
    const effectiveSortDirectionForGeneral = sortKey === 'patrolStartDate' ? 'desc' : sortDirection;

    const sortedGeneral = [...generalAssessments].sort((a, b) => {
        let comparisonResult = 0;
        const valA = a[effectiveSortKeyForGeneral as keyof RiskAssessment];
        const valB = b[effectiveSortKeyForGeneral as keyof RiskAssessment];

        if (effectiveSortKeyForGeneral === 'status' || effectiveSortKeyForGeneral === 'vesselName' || effectiveSortKeyForGeneral === 'region') {
            const strValA = String(valA || '').toLowerCase();
            const strValB = String(valB || '').toLowerCase();
            comparisonResult = strValA.localeCompare(strValB);
        } else { // Date fields (submissionDate, lastModified, patrolStartDate)
            const dateA = valA ? parseISO(String(valA)) : new Date(0); // Fallback for invalid/missing dates
            const dateB = valB ? parseISO(String(valB)) : new Date(0);
            if (isValid(dateA) && isValid(dateB)) {
                comparisonResult = dateA.getTime() - dateB.getTime();
            } else if (isValid(dateA)) comparisonResult = -1; // Valid dates first
            else if (isValid(dateB)) comparisonResult = 1;
            else comparisonResult = 0;
        }
        return effectiveSortDirectionForGeneral === 'asc' ? comparisonResult : -comparisonResult;
    });


    // Process patrolAssessments
    let userSortedPatrolAssessments: RiskAssessment[] = [];

    if (sortKey === 'patrolStartDate') {
        userSortedPatrolAssessments = [...patrolAssessments].sort((a, b) => {
            const dateAVal = a.patrolStartDate ? parseISO(a.patrolStartDate) : null;
            const dateBVal = b.patrolStartDate ? parseISO(b.patrolStartDate) : null;
            let comparison = 0;

            if (dateAVal && dateBVal && isValid(dateAVal) && isValid(dateBVal)) {
                comparison = dateAVal.getTime() - dateBVal.getTime();
            } else if (dateAVal && isValid(dateAVal)) comparison = -1;
            else if (dateBVal && isValid(dateBVal)) comparison = 1;

            if (comparison === 0) {
                comparison = a.vesselName.localeCompare(b.vesselName);
                if (comparison === 0) {
                    const endDateA = a.patrolEndDate ? parseISO(a.patrolEndDate) : null;
                    const endDateB = b.patrolEndDate ? parseISO(b.patrolEndDate) : null;
                    if (endDateA && endDateB && isValid(endDateA) && isValid(endDateB)) {
                        comparison = endDateA.getTime() - endDateB.getTime();
                    } else if (endDateA && isValid(endDateA)) comparison = -1;
                    else if (endDateB && isValid(endDateB)) comparison = 1;
                }
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    } else {
        // Sort by user's chosen key first, then these will be grouped
        userSortedPatrolAssessments = [...patrolAssessments].sort((a, b) => {
            let comparisonResult = 0;
            const valA = a[sortKey as keyof RiskAssessment];
            const valB = b[sortKey as keyof RiskAssessment];

            if (sortKey === 'status' || sortKey === 'vesselName' || sortKey === 'region') {
                const strValA = String(valA || '').toLowerCase();
                const strValB = String(valB || '').toLowerCase();
                comparisonResult = strValA.localeCompare(strValB);
            } else { // Date fields (submissionDate, lastModified)
                const dateA = valA ? parseISO(String(valA)) : new Date(0);
                const dateB = valB ? parseISO(String(valB)) : new Date(0);
                if (isValid(dateA) && isValid(dateB)) {
                    comparisonResult = dateA.getTime() - dateB.getTime();
                } else if (isValid(dateA)) comparisonResult = -1;
                else if (isValid(dateB)) comparisonResult = 1;
            }
            return sortDirection === 'asc' ? comparisonResult : -comparisonResult;
        });
    }

    // Group the (now sorted by user pref or patrolStartDate) patrol assessments
    const patrolGroups: Record<string, RiskAssessment[]> = {};
    userSortedPatrolAssessments.forEach(assessment => {
      const startDate = parseISO(assessment.patrolStartDate!);
      const endDate = assessment.patrolEndDate ? parseISO(assessment.patrolEndDate) : null;
      
      let dateRangeString = format(startDate, 'MMM d, yyyy');
      if (endDate && isValid(endDate)) {
          dateRangeString += ` ${getTranslation(T.to)} ${format(endDate, 'MMM d, yyyy')}`;
      }
      const groupKey = `${assessment.vesselName} - ${dateRangeString}`;
      
      if (!patrolGroups[groupKey]) {
        patrolGroups[groupKey] = [];
      }
      patrolGroups[groupKey].push(assessment);
    });

    // If not sorting by patrolStartDate, the groups themselves should still be chronological by their inherent start date
    let sortedPatrolEntries = Object.entries(patrolGroups);
    if (sortKey !== 'patrolStartDate') {
        sortedPatrolEntries = sortedPatrolEntries.sort(([keyA], [keyB]) => {
            const dateStrA = keyA.match(/(\d{4}-\d{2}-\d{2}(?: to \d{4}-\d{2}-\d{2})?)$/)?.[0].split(' to ')[0];
            const dateStrB = keyB.match(/(\d{4}-\d{2}-\d{2}(?: to \d{4}-\d{2}-\d{2})?)$/)?.[0].split(' to ')[0];
            
            const dateA = dateStrA ? parseISO(dateStrA.replace(/MMM d, yyyy/, (match) => format(parseISO(match), 'yyyy-MM-dd'))) : null;
            const dateB = dateStrB ? parseISO(dateStrB.replace(/MMM d, yyyy/, (match) => format(parseISO(match), 'yyyy-MM-dd'))) : null;


            if (dateA && dateB && isValid(dateA) && isValid(dateB)) {
                return dateA.getTime() - dateB.getTime(); // Always ascending for group order unless sortKey is patrolStartDate
            }
            return keyA.localeCompare(keyB);
        });
    }
    
    finalResult.push(...sortedPatrolEntries);

    if (sortedGeneral.length > 0) {
      finalResult.push([getTranslation(T.generalAssessmentsLabel), sortedGeneral]);
    }
    return finalResult;

  }, [filteredAssessments, sortKey, sortDirection, getTranslation, currentLanguage]);


  const currentSortLabel = useMemo(() => {
    const option = sortOptions.find(opt => opt.value === sortKey);
    if (!option) return getTranslation(T.sort);
    if (option.labelKey) return getTranslation(T[option.labelKey]);
    return currentLanguage === 'fr' ? option.staticFrLabel : option.staticLabel;
  }, [sortKey, getTranslation, currentLanguage]);


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
                  {opt.labelKey ? getTranslation(T[opt.labelKey]) : (currentLanguage === 'fr' ? opt.staticFrLabel : opt.staticLabel)}
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

      {groupedAndSortedAssessments.length > 0 ? (
        <div className="space-y-8">
          {groupedAndSortedAssessments.map(([groupKey, assessmentsInGroup]) => {
            const isGeneralAssessmentsGroup = groupKey === getTranslation(T.generalAssessmentsLabel);
            const IconToUse = groupKey.includes(getTranslation(T.to)) || groupKey.includes("Patrol starting") ? CalendarClock : (isGeneralAssessmentsGroup ? Info : ShipIcon);
            
            return (
              <section key={groupKey} aria-labelledby={`group-${groupKey.replace(/\s+/g, '-').toLowerCase()}`}>
                <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                  <IconToUse className="h-6 w-6 text-secondary" />
                  <h2 id={`group-${groupKey.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl sm:text-2xl font-semibold text-secondary">
                    {groupKey}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {assessmentsInGroup.map(assessment => (
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
            <CardHeader>
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle>{getTranslation(T.noAssessmentsFound)}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-muted-foreground">
                    {getTranslation(T.noMatchFilters)}
                </CardDescription>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

