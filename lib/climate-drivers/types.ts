// lib/climate-drivers/types.ts

export type EnsoStatusType = "El Niño" | "La Niña" | "Neutral";
export type IodStatusType = "Positive" | "Negative" | "Neutral";
export type MjoStatusType = "Active" | "Inactive";
export type ConvectionState = "Enhanced" | "Suppressed" | "Neutral";

export interface EnsoData {
  status: EnsoStatusType;
  oni: number; // Oceanic Niño Index (°C)
  nino34: number; // SST Anomaly in Niño 3.4 region (°C)
  soi: number; // Southern Oscillation Index
  lastUpdated: string;
  dataSource: string;
  sourceUrl: string;
  summary: string;
  historicalOni: Array<{ date: string; oni: number; anomaly: number }>;
  historicalNino34: Array<{ date: string; value: number }>;
  historicalSoi: Array<{ date: string; value: number }>;
  interpretation: {
    whatIsIt: string;
    indonesiaImpact: string;
    phaseDifference: string;
    currentAssessment: string;
  };
}

export interface MjoData {
  phase: number; // 1 to 8
  amplitude: number;
  status: MjoStatusType;
  convectionOverMC: ConvectionState; // Maritime Continent (Phase 4-5)
  lastUpdated: string;
  dataSource: string;
  sourceUrl: string;
  summary: string;
  rmm1: number;
  rmm2: number;
  phaseDiagram: Array<{ rmm1: number; rmm2: number; phase: number; date: string }>;
  historicalAmplitude: Array<{ date: string; amplitude: number; phase: number }>;
  phaseTimeline: Array<{ date: string; phase: number; amplitude: number }>;
  interpretation: {
    whatIsIt: string;
    phaseMeanings: Array<{ phase: number; name: string; impact: string }>;
    indonesiaImpact: string;
    currentAssessment: string;
  };
}

export interface IodData {
  dmi: number; // Dipole Mode Index (°C)
  status: IodStatusType;
  lastUpdated: string;
  dataSource: string;
  sourceUrl: string;
  summary: string;
  historicalDmi: Array<{ date: string; dmi: number }>;
  historicalPeriods: Array<{ date: string; dmi: number; type: "Positive" | "Negative" | "Neutral" }>;
  interpretation: {
    whatIsIt: string;
    positiveIod: string;
    negativeIod: string;
    indonesiaImpact: string;
    currentAssessment: string;
  };
}

export interface ClimateDriversSummary {
  enso: {
    status: EnsoStatusType;
    oni: number;
    description: string;
    dataSource: string;
  };
  mjo: {
    phase: number;
    amplitude: number;
    status: MjoStatusType;
    convectionOverMC: ConvectionState;
    description: string;
    dataSource: string;
  };
  iod: {
    dmi: number;
    status: IodStatusType;
    description: string;
    dataSource: string;
  };
  lastUpdated: string;
}
