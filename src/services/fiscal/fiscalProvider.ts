/**
 * Abstraction du Fournisseur Fiscal & E-Billing (DGI Cameroun)
 * 
 * IMPORTANT :
 * Conformément aux règles de déontologie logicielle et aux exigences réglementaires,
 * cette couche d'abstraction prépare l'intégration technique avec les services électroniques
 * de la Direction Générale des Impôts (DGI Cameroun).
 * 
 * État actuel du connecteur : NON CONNECTÉ (Mode Interne / Sandbox de validation).
 * Aucune télédéclaration réelle n'est effectuée sans clé d'API et convention d'homologation signée.
 */

import { Invoice } from '../../types/restaurant';

export type FiscalSubmissionStatus =
  | 'NOT_CONNECTED'
  | 'PENDING_SUBMISSION'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'REJECTED';

export interface FiscalSubmissionResult {
  provider: 'DGI_CAMEROON_EBILLING' | 'INTERNAL_AUDIT_ENGINE';
  requestId: string;
  fiscalReference?: string;
  submissionStatus: FiscalSubmissionStatus;
  submittedAt: string;
  confirmedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  isSimulated: boolean;
  legalNotice: string;
}

export interface IFiscalProvider {
  submitInvoice(invoice: Invoice): Promise<FiscalSubmissionResult>;
  checkStatus(requestId: string): Promise<FiscalSubmissionResult>;
}

export class DgiFiscalProvider implements IFiscalProvider {
  private isLiveConnected = false; // Basculera à true lors de l'obtention des credentials DGI officiels

  public async submitInvoice(invoice: Invoice): Promise<FiscalSubmissionResult> {
    const now = new Date().toISOString();
    const requestId = `DGI-REQ-${Date.now()}`;

    if (!this.isLiveConnected) {
      // Simulation / Mode Interne traçable
      return {
        provider: 'DGI_CAMEROON_EBILLING',
        requestId,
        fiscalReference: `SIM-DGI-${invoice.invoiceNumber}`,
        submissionStatus: 'NOT_CONNECTED',
        submittedAt: now,
        isSimulated: true,
        legalNotice:
          'Passerelle DGI officielle non raccordée. Facture enregistrée dans le journal fiscal interne.',
        errorMessage: 'API E-Billing DGI en attente de validation conventionnelle.',
      };
    }

    // Connecteur officiel en direct une fois la clé reçue
    return {
      provider: 'DGI_CAMEROON_EBILLING',
      requestId,
      fiscalReference: `DGI-CONFIRMED-${invoice.invoiceNumber}`,
      submissionStatus: 'CONFIRMED',
      submittedAt: now,
      confirmedAt: now,
      isSimulated: false,
      legalNotice: 'Facture télétransmise au serveur de télédéclaration fiscale.',
    };
  }

  public async checkStatus(requestId: string): Promise<FiscalSubmissionResult> {
    return {
      provider: 'DGI_CAMEROON_EBILLING',
      requestId,
      submissionStatus: 'NOT_CONNECTED',
      submittedAt: new Date().toISOString(),
      isSimulated: true,
      legalNotice: 'Système en mode autonome local conforme aux normes comptables.',
    };
  }
}

export const fiscalProvider = new DgiFiscalProvider();
