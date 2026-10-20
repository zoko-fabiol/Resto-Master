import { onCall } from 'firebase-functions/v2/https';
import { handleCreateUser, handleSetUserRole } from './modules/users.js';
import { handleSetPin, handleVerifyPin, handleVerifySupervisor } from './modules/pin.js';
import { handleCreateOrder, handleAddItemsToOrder } from './modules/orders.js';
import { handleRecordPayment } from './modules/payments.js';
import { handleCancelOrder, handleVoidItem } from './modules/cancellations.js';
import { handleOpenCashSession, handleCloseCashSession } from './modules/cash.js';
import { handleIssueInvoice } from './modules/invoices.js';
import { handleAppendAuditLog } from './modules/audit.js';
import { handleGeneratePairingCode, handlePairDevice } from './modules/terminals.js';

const FUNCTION_OPTIONS = {
  region: 'europe-west1',
  cors: true,
  maxInstances: 50,
};

// 1. Identité, Utilisateurs et Rôles RBAC
export const createUser = onCall(FUNCTION_OPTIONS, handleCreateUser);
export const setUserRole = onCall(FUNCTION_OPTIONS, handleSetUserRole);

// 2. Sécurité PIN & Superviseurs
export const setPin = onCall(FUNCTION_OPTIONS, handleSetPin);
export const verifyPin = onCall(FUNCTION_OPTIONS, handleVerifyPin);
export const verifySupervisor = onCall(FUNCTION_OPTIONS, handleVerifySupervisor);

// 3. Commandes Certifiées Serveur
export const createOrder = onCall(FUNCTION_OPTIONS, handleCreateOrder);
export const addItemsToOrder = onCall(FUNCTION_OPTIONS, handleAddItemsToOrder);

// 4. Encaissements Transactionnels et Idempotents
export const recordPayment = onCall(FUNCTION_OPTIONS, handleRecordPayment);

// 5. Annulations, Perte et Avoirs
export const cancelOrder = onCall(FUNCTION_OPTIONS, handleCancelOrder);
export const voidItem = onCall(FUNCTION_OPTIONS, handleVoidItem);

// 6. Gestion et Clôture de Caisse (Rapports X et Z)
export const openCashSession = onCall(FUNCTION_OPTIONS, handleOpenCashSession);
export const closeCashSession = onCall(FUNCTION_OPTIONS, handleCloseCashSession);

// 7. Facturation Certifiée DGI et Scellement SHA-256
export const issueInvoice = onCall(FUNCTION_OPTIONS, handleIssueInvoice);

// 8. Journal d'Audit Immuable
export const appendAuditLog = onCall(FUNCTION_OPTIONS, handleAppendAuditLog);

// 9. Appairage Sécurisé des Terminaux
export const generatePairingCode = onCall(FUNCTION_OPTIONS, handleGeneratePairingCode);
export const pairDevice = onCall(FUNCTION_OPTIONS, handlePairDevice);

