"use client";

import { create } from "zustand";
import type { CsvValidationError } from "@/lib/csv";

export type ImportStep = 1 | 2 | 3 | 4;

export type ImportResult = {
  batchId: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorCount: number;
};

type CsvImportState = {
  fileName: string;
  parsedRows: Record<string, string>[];
  validRows: Record<string, string>[];
  errorRows: CsvValidationError[];
  step: ImportStep;
  result: ImportResult | null;
  setFile: (fileName: string, rows: Record<string, string>[]) => void;
  setValidation: (validRows: Record<string, string>[], errorRows: CsvValidationError[]) => void;
  setStep: (step: ImportStep) => void;
  setResult: (result: ImportResult) => void;
  reset: () => void;
};

export const useCsvImportStore = create<CsvImportState>((set) => ({
  fileName: "",
  parsedRows: [],
  validRows: [],
  errorRows: [],
  step: 1,
  result: null,
  setFile: (fileName, parsedRows) => set({ fileName, parsedRows, validRows: [], errorRows: [], result: null, step: 2 }),
  setValidation: (validRows, errorRows) => set({ validRows, errorRows }),
  setStep: (step) => set({ step }),
  setResult: (result) => set({ result, step: 4 }),
  reset: () => set({ fileName: "", parsedRows: [], validRows: [], errorRows: [], result: null, step: 1 })
}));
