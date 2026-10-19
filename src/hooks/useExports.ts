// ============================================================
// src/hooks/useExports.ts
// Hook centralisant l'accès aux générateurs d'exports PDF, XLSX et DOCX
// ============================================================

import { useRhAppData } from './useFirestore';
import {
  exportPersonnelPDF as baseExportPersonnelPDF,
  exportAttendancePDF as baseExportAttendancePDF,
  exportAttendanceTodayPDF as baseExportAttendanceTodayPDF,
  exportPayrollPDF as baseExportPayrollPDF,
  exportRHHistoryPDF as baseExportRHHistoryPDF,
} from '../utils/exportRHPDF';

import {
  exportPersonnelXLSX as baseExportPersonnelXLSX,
  exportAttendanceXLSX as baseExportAttendanceXLSX,
} from '../utils/exportRHXLSX';

import {
  exportPersonnelDOCX as baseExportPersonnelDOCX,
} from '../utils/docxGenerator';

export const useExports = () => {
  const rhData = useRhAppData();
  const employees = rhData?.employees || [];
  const attendance = rhData?.attendance || {};
  const attendanceDetails = rhData?.attendanceDetails || {};
  const dailyNotes = rhData?.dailyNotes || {};

  const exportPersonnelPDF = (optionsOrEmployees?: any, maybeOptions?: any) => {
    if (Array.isArray(optionsOrEmployees)) {
      return baseExportPersonnelPDF(optionsOrEmployees, maybeOptions);
    }
    return baseExportPersonnelPDF(employees, optionsOrEmployees);
  };

  const exportPersonnelXLSX = (optionsOrEmployees?: any, maybeOptions?: any) => {
    if (Array.isArray(optionsOrEmployees)) {
      return baseExportPersonnelXLSX(optionsOrEmployees, maybeOptions);
    }
    return baseExportPersonnelXLSX(employees, optionsOrEmployees);
  };

  const exportPersonnelDOCX = async (optionsOrEmployees?: any, maybeOptions?: any) => {
    if (Array.isArray(optionsOrEmployees)) {
      return baseExportPersonnelDOCX(optionsOrEmployees, maybeOptions);
    }
    return baseExportPersonnelDOCX(employees, optionsOrEmployees);
  };

  const exportAttendancePDF = (
    filtersOrEmployees?: any,
    maybeAttendance?: any,
    maybeFilters?: any,
    maybeDetails?: any,
    maybeNotes?: any
  ) => {
    if (Array.isArray(filtersOrEmployees)) {
      return baseExportAttendancePDF(
        filtersOrEmployees,
        maybeAttendance,
        maybeFilters,
        maybeDetails,
        maybeNotes
      );
    }
    return baseExportAttendancePDF(
      employees,
      attendance,
      filtersOrEmployees || { year: new Date().getFullYear(), month: new Date().getMonth() },
      attendanceDetails,
      dailyNotes
    );
  };

  const exportAttendanceTodayPDF = (
    filtersOrEmployees?: any,
    maybeAttendance?: any,
    maybeDetails?: any,
    maybeNotes?: any,
    maybeOptions?: any
  ) => {
    if (Array.isArray(filtersOrEmployees)) {
      return baseExportAttendanceTodayPDF(
        filtersOrEmployees,
        maybeAttendance,
        maybeDetails,
        maybeNotes,
        maybeOptions
      );
    }
    return baseExportAttendanceTodayPDF(
      employees,
      attendance,
      attendanceDetails,
      dailyNotes,
      filtersOrEmployees
    );
  };

  const exportAttendanceXLSX = (
    filtersOrEmployees?: any,
    maybeAttendance?: any,
    maybeFilters?: any
  ) => {
    if (Array.isArray(filtersOrEmployees)) {
      return baseExportAttendanceXLSX(filtersOrEmployees, maybeAttendance, maybeFilters);
    }
    return baseExportAttendanceXLSX(employees, attendance, filtersOrEmployees || {});
  };

  return {
    exportPersonnelPDF,
    exportPersonnelXLSX,
    exportPersonnelDOCX,
    exportAttendancePDF,
    exportAttendanceTodayPDF,
    exportAttendanceXLSX,
    exportPayrollPDF: baseExportPayrollPDF,
    exportRHHistoryPDF: baseExportRHHistoryPDF,
  };
};
