# RestoMaster OS & Admin Panel — Architecture de Sécurité & Modèle Zero-Trust

> **Classification** : Référentiel de Sécurité & Conformité  
> **Norme de référence** : Zero-Trust Architecture, OWASP ASVS v4.0, PCI-DSS / CGI 2026

---

## 1. Principes Fondamentaux de Sécurité (Zero-Trust)

La conception architecturale de RestoMaster OS et de sa console d'administration repose sur trois postulats non négociables :
1. **Ne jamais faire confiance au client web** : Toutes les vérifications de droits, d'intégrité de montants, d'attributions de rôles et de déduction de stocks sont exécutées et assertées côté serveur dans des Cloud Functions v2.
2. **Moindre Privilège Stricte (PoLP)** : Chaque collaborateur et chaque administrateur plateforme dispose du périmètre minimal de données et d'actions nécessaire à sa mission.
3. **Zéro Secret en Clair** : Aucun mot de passe, clé d'API, code PIN ou secret d'authentification n'est stocké en clair ou transmis dans Firestore, l'UI ou les journaux.

---

## 2. Découpage Hermétique des Rôles : Plateforme vs Restaurant

Une faille fréquente dans les architectures SaaS réside dans la confusion entre l'administrateur d'un restaurant et le super-administrateur de la plateforme logicielle.

RestoMaster applique une dissociation hermétique :

```
                          ┌───────────────────────────┐
                          │   Firebase Authentication │
                          └─────────────┬─────────────┘
                                        │
                         Custom Claims sur le Token JWT
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             │                                                     │
   Rôles Métier Restaurant                               Rôles Plateforme SaaS
   (Scoped à organizationId)                             (Transverses et Découplés)
             │                                                     │
    claim: role                                          claim: platformRole
    • superadmin (Propriétaire resto)                    • platform_owner (Fondateur)
    • direction  (Directeur général)                     • platform_admin (Opérations)
    • manager    (Chef de salle)                         • support        (Assistance N2)
    • serveur    (Prise de commande)                     • billing        (Facturation)
    • caissier   (Encaissement POS)                      • viewer         (Consultation)
    • cuisinier  (KDS Cuisine)
    • barman     (KDS Bar)
    • stock      (Gestion économat)
```

### Règles de non-élévation
- Un propriétaire de restaurant (`role: 'superadmin'`) ne peut **en aucun cas** accéder aux données des autres restaurants ni s'attribuer un `platformRole`.
- La fonction d'auto-élévation client (`claimInitialSuperadmin`) a été définitivement supprimée. Les `platformRole` ne peuvent être concédés que par un `platform_owner` déjà authentifié.

---

## 3. Protection des Codes PIN & Secrets (Zero-Trust Storage)

### Architecture de Hachage des Codes PIN
Les codes PIN des serveurs, caissiers et managers (utilisés pour les ouvertures de caisse, remises exceptionnelles et annulations d'articles) ne sont jamais stockés dans la collection `users` :

1. **Collection isolée `user_pins/{uid}`** :
   - Inaccessible en lecture directe par les clients web (`allow read, write: if false;` dans `firestore.rules`).
   - Accessible exclusivement par les Cloud Functions serveur exécutant le SDK Firebase Admin.
2. **Hachage PBKDF2 avec Sel Aléatoire Unique** :
   - Algorithme : `PBKDF2-HMAC-SHA512`.
   - Paramètres : Sel cryptographique aléatoire de 16 octets (`crypto.randomBytes(16)`), $100\,000$ itérations.
   - Format de stockage : `pbkdf2$100000${saltHex}${hashHex}`.
3. **Vérification côté serveur (`verifySupervisorPin`)** :
   - L'UI transmet le PIN saisi dans une requête HTTPS chiffrée (TLS 1.3).
   - La Cloud Function dérive le hash à partir du sel stocké et compare les signatures en temps constant (`crypto.timingSafeEqual`) pour prévenir les attaques temporelles (*timing attacks*).
4. **Transport Épuré vers l'UI** :
   - Le service `subscribeToTenantUsers` applique un filtre chirurgical éliminant systématiquement `pinCode`, `password` et `pinHash`.
   - Seul le fanion booléen `hasPin: boolean` est exposé pour indiquer si l'employé a déjà configuré son code.

---

## 4. Piste d'Audit Scellée par Chaînage Cryptographique (SHA-256)

Afin de garantir l'inviolabilité et la force probante du journal d'audit (`platform_audit_logs`), chaque enregistrement est lié au précédent selon un mécanisme de chaîne cryptographique inspiré des registres distribués :

```
    ┌──────────────────────┐             ┌──────────────────────┐
    │     Audit Log N-1    │             │      Audit Log N     │
    ├──────────────────────┤             ├──────────────────────┤
    │ action: APPROVE_...  │             │ action: CHANGE_PLAN  │
    │ actor: admin@...     │             │ actor: admin@...     │
    │ sha256Hash: [H(N-1)] ├────────────►│ prevHash: [H(N-1)]   │
    └──────────────────────┘             │ sha256Hash: [H(N)]   │
                                         └──────────────────────┘
```

### Calcul de l'Empreinte Canonique
$$\text{sha256Hash} = \text{SHA-256}\Big(\text{canonicalJSON}\big(\text{prevHash}, \text{timestamp}, \text{actorUid}, \text{action}, \text{targetOrgId}, \text{detail}, \text{before}, \text{after}\big)\Big)$$

### Propriétés Garanties
- **Détection immédiate d'altération** : Toute modification rétroactive ou suppression d'un log dans Firestore invalide immédiatement tous les condensats subséquents de la chaîne.
- **Écriture exclusive serveur** : `allow write: if false;` empêche tout client web de modifier ou d'injecter des logs frauduleux.

---

## 5. Isolation Multi-Tenant dans Firestore Rules

L'accès à chaque collection de données (`orders`, `tables`, `kds_tickets`, `stock_items`, `cash_registers`) est validé par l'assertion du claim `organizationId` :

```javascript
function callerOrgId() {
  return request.auth.token.organizationId != null 
    ? request.auth.token.organizationId 
    : (request.auth.token.orgId != null ? request.auth.token.orgId : '');
}

function isTenantMember(orgId) {
  return isAuthenticated() && callerOrgId() == orgId;
}

function tenantActive() {
  // Interdit toute écriture aux établissements suspendus ou résiliés
  return request.auth.token.tenantStatus == 'actif' ||
         request.auth.token.tenantStatus == 'essai' ||
         request.auth.token.tenantStatus == 'onboarding';
}
```

---

## 6. Règle des Deux Administrateurs (2-Man Rule)

Pour toute action destructrice (résiliation, purge de données d'un client), la règle des 2 administrateurs est formalisée au niveau de la Cloud Function :

1. **Séparation des Acteurs** :
   ```typescript
   if (delData.requestedByUid === caller.uid) {
     throw new HttpsError(
       'permission-denied',
       'Règle de sécurité violée : la suppression d\'un client exige impérativement la validation d\'un SECOND administrateur distinct.'
     );
   }
   ```
2. **Délai de Grâce de 30 Jours** :
   - La date de purge légale est fixée à $t_{\text{purge}} = t_{\text{demande}} + 30\text{ jours}$.
   - Pendant ce délai, les données demeurent en lecture seule pour des besoins d'audit ou de contentieux commercial.
