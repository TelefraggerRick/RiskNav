"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { RiskAssessment, RiskAssessmentStatus } from '@/lib/types';
import { mockRiskAssessments } from '@/lib/mockData'; 
import RiskAssessmentCard from '@/components/risk-assessments/RiskAssessmentCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Filter, ArrowUpDown, Search, X, ListFilter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortKey = 'submissionDate' | 'status' | 'vesselName' | 'lastModified';
type SortDirection = 'asc' | 'desc';

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'submissionDate', label: 'Submission Date' },
  { value: 'lastModified', label: 'Last Modified' },
  { value: 'status', label: 'Status' },
  { value: 'vesselName', label: 'Vessel Name' },
];

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RiskAssessmentStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lastModified');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    setAssessments(mockRiskAssessments);
  }, []);

  const filteredAndSortedAssessments = useMemo(() => {
    let filtered = assessments;

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(assessment =>
        assessment.vesselName.toLowerCase().includes(lowerSearchTerm) ||
        assessment.referenceNumber.toLowerCase().includes(lowerSearchTerm) ||
        assessment.reasonForRequest.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(assessment => assessment.status === statusFilter);
    }

    return [...filtered].sort((a, b) => {
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
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assessments, searchTerm, statusFilter, sortKey, sortDirection]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc'); // Default to asc when changing sort key
    }
  }, [sortKey]);

  const statuses: RiskAssessmentStatus[] = ['Pending', 'Under Review', 'Needs Information', 'Approved', 'Rejected'];
  const currentSortLabel = sortOptions.find(opt => opt.value === sortKey)?.label || 'Sort';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Risk Assessments</h1>
      </div>

      <Card className="p-4 sm:p-6 shadow-sm rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
              aria-label="Search assessments"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={(value: RiskAssessmentStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-full text-sm" aria-label="Filter by status">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Filter by Status</SelectLabel>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex justify-between items-center text-sm" aria-label="Sort assessments">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <span>{currentSortLabel}</span>
                </div>
                <span className="text-xs text-muted-foreground">{sortDirection === 'asc' ? 'Asc' : 'Desc'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map(opt => (
                <DropdownMenuItem key={opt.value} onClick={() => handleSort(opt.value)}>
                  {opt.label}
                  {sortKey === opt.value && <ArrowUpDown className="ml-auto h-4 w-4 opacity-50" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {filteredAndSortedAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedAssessments.map(assessment => (
            <RiskAssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center shadow-sm rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Assessments Found</h2>
          <p className="text-muted-foreground">
            No risk assessments match your current filters. Try adjusting your search or filter criteria, or create a new assessment.
          </p>
        </Card>
      )}
    </div>
  );
}
