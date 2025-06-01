
"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldAlert, ShieldCheck, ShieldQuestion, AlertTriangle } from 'lucide-react'; 
import { useLanguage } from '@/contexts/LanguageContext';


interface RiskMatrixProps {
  likelihoodScore?: number; // 1-5
  consequenceScore?: number; // 1-5
}

const likelihoodLabels: Record<string, { en: string; fr: string }> = {
  1: { en: "Rare", fr: "Rare" },
  2: { en: "Unlikely", fr: "Improbable" },
  3: { en: "Possible", fr: "Possible" },
  4: { en: "Likely", fr: "Probable" },
  5: { en: "Almost Certain", fr: "Presque certain" },
};

const consequenceLabels: Record<string, { en: string; fr: string }> = {
  1: { en: "Insignificant", fr: "Insignifiant" },
  2: { en: "Minor", fr: "Mineur" },
  3: { en: "Moderate", fr: "Modéré" },
  4: { en: "Major", fr: "Majeur" },
  5: { en: "Catastrophic", fr: "Catastrophique" },
};

const riskLevelMap: Record<string, { level: string; fr_level: string; color: string; textColor: string; icon?: React.ElementType }> = {
  // Likelihood 5 (Almost Certain)
  "5-1": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-500", textColor: "text-yellow-900", icon: AlertTriangle },
  "5-2": { level: "High", fr_level: "Élevé", color: "bg-orange-500", textColor: "text-white", icon: ShieldAlert },
  "5-3": { level: "Extreme", fr_level: "Extrême", color: "bg-red-600", textColor: "text-white", icon: ShieldAlert },
  "5-4": { level: "Extreme", fr_level: "Extrême", color: "bg-red-700", textColor: "text-white", icon: ShieldAlert },
  "5-5": { level: "Extreme", fr_level: "Extrême", color: "bg-red-800", textColor: "text-white", icon: ShieldAlert },
  // Likelihood 4 (Likely)
  "4-1": { level: "Low", fr_level: "Faible", color: "bg-green-500", textColor: "text-white", icon: ShieldCheck },
  "4-2": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-500", textColor: "text-yellow-900", icon: AlertTriangle },
  "4-3": { level: "High", fr_level: "Élevé", color: "bg-orange-500", textColor: "text-white", icon: ShieldAlert },
  "4-4": { level: "Extreme", fr_level: "Extrême", color: "bg-red-600", textColor: "text-white", icon: ShieldAlert },
  "4-5": { level: "Extreme", fr_level: "Extrême", color: "bg-red-700", textColor: "text-white", icon: ShieldAlert },
  // Likelihood 3 (Possible)
  "3-1": { level: "Low", fr_level: "Faible", color: "bg-green-400", textColor: "text-green-900", icon: ShieldCheck },
  "3-2": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-400", textColor: "text-yellow-900", icon: AlertTriangle },
  "3-3": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-500", textColor: "text-yellow-900", icon: AlertTriangle },
  "3-4": { level: "High", fr_level: "Élevé", color: "bg-orange-500", textColor: "text-white", icon: ShieldAlert },
  "3-5": { level: "Extreme", fr_level: "Extrême", color: "bg-red-600", textColor: "text-white", icon: ShieldAlert },
  // Likelihood 2 (Unlikely)
  "2-1": { level: "Low", fr_level: "Faible", color: "bg-green-300", textColor: "text-green-900", icon: ShieldCheck },
  "2-2": { level: "Low", fr_level: "Faible", color: "bg-green-400", textColor: "text-green-900", icon: ShieldCheck },
  "2-3": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-400", textColor: "text-yellow-900", icon: AlertTriangle },
  "2-4": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-500", textColor: "text-yellow-900", icon: AlertTriangle },
  "2-5": { level: "High", fr_level: "Élevé", color: "bg-orange-500", textColor: "text-white", icon: ShieldAlert },
  // Likelihood 1 (Rare)
  "1-1": { level: "Low", fr_level: "Faible", color: "bg-green-200", textColor: "text-green-900", icon: ShieldCheck },
  "1-2": { level: "Low", fr_level: "Faible", color: "bg-green-300", textColor: "text-green-900", icon: ShieldCheck },
  "1-3": { level: "Low", fr_level: "Faible", color: "bg-green-400", textColor: "text-green-900", icon: ShieldCheck },
  "1-4": { level: "Low", fr_level: "Faible", color: "bg-green-500", textColor: "text-white", icon: ShieldCheck },
  "1-5": { level: "Medium", fr_level: "Moyen", color: "bg-yellow-400", textColor: "text-yellow-900", icon: AlertTriangle },
};

const T_MATRIX = {
  title: { en: "AI-Generated Risk Matrix (ISO 31000)", fr: "Matrice de risque générée par IA (ISO 31000)" },
  likelihood: { en: "Likelihood", fr: "Probabilité" },
  consequence: { en: "Consequence", fr: "Conséquence" },
  currentRisk: { en: "Current Assessed Risk", fr: "Risque évalué actuel" },
  notAvailable: { en: "Risk matrix data not available.", fr: "Données de la matrice de risque non disponibles." },
  riskLevel: { en: "Risk Level", fr: "Niveau de risque" },
};

const RiskMatrix: React.FC<RiskMatrixProps> = React.memo(({ likelihoodScore, consequenceScore }) => {
  const { getTranslation, currentLanguage } = useLanguage();
  
  const likelihoodAxis = [5, 4, 3, 2, 1]; // Almost Certain to Rare
  const consequenceAxis = [1, 2, 3, 4, 5]; // Insignificant to Catastrophic

  const getRiskData = (l: number, c: number) => {
    return riskLevelMap[`${l}-${c}`] || { level: "Unknown", fr_level: "Inconnu", color: "bg-gray-300", textColor: "text-gray-800", icon: ShieldQuestion };
  };

  if (likelihoodScore === undefined || consequenceScore === undefined) {
    return (
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base font-semibold">{getTranslation(T_MATRIX.title)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{getTranslation(T_MATRIX.notAvailable)}</p>
        </CardContent>
      </Card>
    );
  }

  const plottedRisk = getRiskData(likelihoodScore, consequenceScore);
  const PlottedIcon = plottedRisk.icon || ShieldQuestion;


  return (
    <Card className="shadow-md rounded-lg overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold text-primary">
          {getTranslation(T_MATRIX.title)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <TooltipProvider>
          <div className="flex">
            {/* Likelihood Axis Label (Vertical) */}
            <div className="flex items-center justify-center pr-2 sm:pr-4 -rotate-90 whitespace-nowrap">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wider">
                {getTranslation(T_MATRIX.likelihood)}
              </span>
            </div>

            <div className="flex-grow">
              {/* Consequence Axis Labels (Top) */}
              <div className="grid grid-cols-6 gap-0.5">
                <div className="pb-1"></div> {/* Corner empty cell */}
                {consequenceAxis.map(c => (
                  <div key={`con-label-${c}`} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 truncate" title={getTranslation(consequenceLabels[c.toString()])}>
                     {getTranslation(consequenceLabels[c.toString()]).substring(0,3)}..
                  </div>
                ))}
              </div>

              {/* Matrix Grid */}
              {likelihoodAxis.map(l => (
                <div key={`row-${l}`} className="grid grid-cols-6 gap-0.5 items-stretch">
                  {/* Likelihood Row Label */}
                  <div className="flex items-center justify-center text-xs sm:text-sm font-medium text-muted-foreground p-1 truncate" title={getTranslation(likelihoodLabels[l.toString()])}>
                     {getTranslation(likelihoodLabels[l.toString()]).substring(0,3)}..
                  </div>
                  {/* Matrix Cells */}
                  {consequenceAxis.map(c => {
                    const cellKey = `${l}-${c}`;
                    const cellRisk = riskLevelMap[cellKey] || { level: "N/A", fr_level: "N/A", color: "bg-gray-200", textColor: "text-gray-700" };
                    const isPlottedCell = l === likelihoodScore && c === consequenceScore;
                    const CellIcon = cellRisk.icon || ShieldQuestion;

                    return (
                      <Tooltip key={cellKey} delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "aspect-square flex items-center justify-center p-1 sm:p-2 text-xs sm:text-sm font-semibold rounded-sm transition-all duration-150 ease-in-out",
                              cellRisk.color,
                              cellRisk.textColor,
                              isPlottedCell ? "ring-2 ring-offset-2 ring-primary scale-105 shadow-lg z-10" : "hover:opacity-80"
                            )}
                          >
                            <div className="flex flex-col items-center justify-center text-center">
                                <CellIcon className={cn("h-3 w-3 sm:h-4 sm:w-4 mb-0.5", cellRisk.textColor)} />
                                <span className="hidden sm:inline">{currentLanguage === 'fr' ? cellRisk.fr_level.charAt(0) : cellRisk.level.charAt(0)}</span>
                                <span className="sm:hidden text-[0.6rem] leading-tight">{currentLanguage === 'fr' ? cellRisk.fr_level : cellRisk.level}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-background text-foreground border shadow-lg p-2 rounded-md text-xs">
                          <p><strong>{getTranslation(T_MATRIX.likelihood)}:</strong> {getTranslation(likelihoodLabels[l.toString()])} ({l})</p>
                          <p><strong>{getTranslation(T_MATRIX.consequence)}:</strong> {getTranslation(consequenceLabels[c.toString()])} ({c})</p>
                          <p><strong>{getTranslation(T_MATRIX.riskLevel)}:</strong> {currentLanguage === 'fr' ? cellRisk.fr_level : cellRisk.level}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
              {/* Consequence Axis Label (Bottom) */}
                <div className="flex items-center justify-center pt-2 sm:pt-4">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wider">
                        {getTranslation(T_MATRIX.consequence)}
                    </span>
                </div>
            </div>
          </div>
          
          {likelihoodScore && consequenceScore && (
            <div className="mt-4 pt-3 border-t text-center sm:text-left">
              <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center justify-center sm:justify-start gap-2">
                <PlottedIcon className={cn("h-5 w-5", plottedRisk.textColor, plottedRisk.color === "bg-yellow-400" || plottedRisk.color === "bg-yellow-500" ? "" : "")} 
                 style={plottedRisk.color.includes('yellow') ? { fill: plottedRisk.textColor, color: plottedRisk.textColor } : {}}
                />
                {getTranslation(T_MATRIX.currentRisk)}: 
                <span className={cn("font-bold px-2 py-0.5 rounded", plottedRisk.color, plottedRisk.textColor)}>
                    {currentLanguage === 'fr' ? plottedRisk.fr_level : plottedRisk.level}
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                ({getTranslation(T_MATRIX.likelihood)}: {getTranslation(likelihoodLabels[likelihoodScore.toString()])} ({likelihoodScore}), {getTranslation(T_MATRIX.consequence)}: {getTranslation(consequenceLabels[consequenceScore.toString()])} ({consequenceScore}))
              </p>
            </div>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
});

RiskMatrix.displayName = 'RiskMatrix';
export default RiskMatrix;
