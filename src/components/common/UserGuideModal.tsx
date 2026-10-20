import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Search,
  UserCheck,
  ChefHat,
  Coins,
  Utensils,
  Calendar,
  Package,
  Users,
  BarChart3,
  Printer,
  HelpCircle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: string;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(initialRole || 'all');

  if (!isOpen) return null;

  const sections = [
    {
      id: 'bienvenue',
      num: 1,
      title: 'Bienvenue',
      roles: ['all', 'manager', 'serveur', 'caisse', 'cuisine'],
      icon: BookOpen,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
          <p>
            Cette plateforme a été conçue pour simplifier la gestion quotidienne de votre restaurant :
            prise de commande, réservations, encaissement, stock, personnel et suivi des ventes, le tout au même endroit.
          </p>
          <p>
            Chaque membre de l'équipe se connecte avec son propre compte et ne voit que les écrans utiles à son travail.
            Ce guide est organisé par rôle : allez directement à la section qui vous concerne.
          </p>
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-900 text-xs">
            <span className="font-bold">Astuce —</span> Si votre restaurant fonctionne sans compte Cuisinier dédié (voir section 6),
            la personne qui prend les commandes en salle ou à la caisse s'occupe aussi de les transmettre en cuisine — ce guide explique les deux façons de faire.
          </div>
        </div>
      ),
    },
    {
      id: 'connexion',
      num: 2,
      title: 'Se connecter à la plateforme',
      roles: ['all', 'manager', 'serveur', 'caisse', 'cuisine'],
      icon: ShieldCheck,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Ouvrez l'application sur votre téléphone, tablette tactile ou ordinateur.</li>
            <li>Saisissez l'identifiant (email) et le mot de passe ou code PIN qui vous ont été remis par votre manager.</li>
            <li>Vous arrivez directement sur l'écran adapté à votre rôle (Tableau de bord pour un manager, Plan de salle et prise de commande pour un serveur, Poste d'encaissement pour un caissier, Écran KDS pour un cuisinier).</li>
          </ol>
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl text-blue-900 text-xs">
            <span className="font-bold">Mot de passe oublié ?</span> Demandez à votre manager de le réinitialiser en 1 clic depuis son espace <em>« Gestion du personnel »</em>.
          </div>
        </div>
      ),
    },
    {
      id: 'manager',
      num: 3,
      title: 'Guide du Propriétaire / Manager',
      roles: ['manager', 'direction'],
      icon: UserCheck,
      content: (
        <div className="space-y-4 text-slate-700 text-xs sm:text-sm">
          <p className="font-medium text-slate-900">
            C'est vous qui configurez le restaurant et supervisez l'activité au quotidien.
          </p>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 text-xs uppercase tracking-wider text-amber-700">
              À faire une seule fois, au démarrage :
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li><strong>Créer les catégories et les plats du menu</strong> (nom, prix, photo, ingrédients et disponibilité).</li>
              <li><strong>Créer le plan de salle</strong> : ajouter vos tables et leur nombre de places par zone.</li>
              <li><strong>Choisir le mode de fonctionnement de la cuisine</strong> : <em>« Écran cuisine »</em> (avec comptes Cuisinier) ou <em>« Sans compte cuisinier »</em> (la caisse transmet les commandes) — voir section 6.</li>
              <li><strong>Créer les comptes de votre équipe</strong> (serveurs, caissiers, cuisiniers) et leur transmettre leurs identifiants.</li>
              <li><strong>Renseigner vos ingrédients et associer une recette</strong> à chaque plat pour la déduction automatique du stock.</li>
              <li><strong>Ajouter vos fournisseurs habituels</strong>.</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-700">
              Au quotidien :
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>Consulter le tableau de bord : commandes du jour, chiffre d'affaires, réservations à venir, alertes de stock bas.</li>
              <li>Mettre à jour le menu (nouveau plat, rupture temporaire 86, changement de prix).</li>
              <li>Suivre les plannings et les présences de l'équipe.</li>
              <li>Consulter les rapports de ventes pour ajuster le menu ou les horaires.</li>
            </ul>
          </div>
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-900 text-xs">
            <span className="font-bold">Astuce —</span> Vous êtes le seul rôle à avoir accès à l'ensemble des rapports financiers et aux paramètres du restaurant.
          </div>
        </div>
      ),
    },
    {
      id: 'serveur',
      num: 4,
      title: 'Guide du Serveur',
      roles: ['serveur'],
      icon: Utensils,
      content: (
        <div className="space-y-4 text-slate-700 text-xs sm:text-sm">
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Prendre une commande</h4>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs">
              <li>Sélectionnez la table concernée sur votre écran (libre, réservée ou déjà occupée).</li>
              <li>Ajoutez les plats choisis par le client, avec les quantités et remarques éventuelles (<em>« sans piment »</em>, cuisson, etc.).</li>
              <li>Envoyez la commande — elle part automatiquement en cuisine, quel que soit le mode choisi par votre restaurant.</li>
            </ol>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs mb-1">Gérer plusieurs tables en même temps</h4>
            <p className="text-xs text-slate-600">
              Votre écran affiche la liste de toutes vos commandes actives, table par table. Vous pouvez passer de l'une à l'autre librement :
              le système garde en mémoire où en est chaque commande, vous n'êtes jamais limité à une seule table à la fois.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Quand un plat est prêt</h4>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Vous recevez une notification (ou vous voyez le statut passer à <em>« Prêt »</em>) : allez chercher le plat et servez-le.</li>
              <li>Marquez la commande comme <em>« Servie »</em> d'un clic.</li>
            </ul>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
            <span className="font-bold text-emerald-800">En fin de repas —</span> Cliquez sur <strong>« Envoyer la commande à la caisse »</strong>.
            La table passe en attente de paiement et la caissière s'occupe de l'encaissement et de l'impression du ticket (section 5).
          </div>
        </div>
      ),
    },
    {
      id: 'caissier',
      num: 5,
      title: 'Guide du Caissier',
      roles: ['caisse'],
      icon: Coins,
      content: (
        <div className="space-y-4 text-slate-700 text-xs sm:text-sm">
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Enregistrer et suivre les commandes</h4>
            <p className="text-xs text-slate-600 mb-2">
              Dès qu'un serveur vous envoie une commande ou demande l'addition, elle apparaît sur votre écran de caisse, rattachée à sa table.
              Vous n'avez rien à ressaisir : vérifiez simplement le détail avant d'enregistrer.
            </p>
            <p className="text-xs text-slate-600">
              ● Une même table peut recevoir plusieurs commandes au fil du repas (une entrée, puis un dessert commandé plus tard) :
              elles s'additionnent automatiquement sur la même addition.
            </p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <strong>Si votre restaurant fonctionne sans compte Cuisinier :</strong> En plus d'enregistrer la commande,
            c'est vous qui la transmettez à la cuisine (écran partagé ou bon imprimé, selon la configuration choisie par votre manager).
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Encaisser et clôturer</h4>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs">
              <li>Quand le client a terminé, ouvrez l'addition de sa table depuis l'écran Caisse.</li>
              <li>Choisissez le mode de paiement : <strong>Espèces</strong>, <strong>Carte bancaire</strong>, ou <strong>Mobile Money (Orange Money / MTN MoMo)</strong>.</li>
              <li>Si plusieurs clients partagent l'addition, utilisez la fonction de division (Par couvert, Égale, ou Par plat) pour répartir le montant.</li>
              <li>Validez le paiement : le ticket s'imprime automatiquement sur l'imprimante thermique Bluetooth du poste de caisse (58 ou 80 mm).</li>
              <li>La table repasse automatiquement en statut <em>« Libre »</em>.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'cuisinier',
      num: 6,
      title: 'Guide du Cuisinier (mode Écran cuisine)',
      roles: ['cuisine'],
      icon: ChefHat,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <p className="text-xs">
            Cette section s'applique si votre restaurant a activé le mode <em>« Écran cuisine »</em> avec des comptes individuels pour la cuisine.
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-xs">
            <li>Les commandes envoyées par les serveurs apparaissent automatiquement sur votre écran, dans l'ordre d'arrivée avec minuteur.</li>
            <li>Dès que vous commencez la préparation, passez la commande en statut <strong>« En préparation »</strong>.</li>
            <li>Une fois le plat terminé, passez-la en statut <strong>« Prêt »</strong> : le serveur concerné est aussitôt informé par notification visuelle et sonore.</li>
          </ol>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700 text-xs">
            <span className="font-bold">Si votre restaurant n'a pas de compte Cuisinier —</span> Cette section ne vous concerne pas :
            c'est la caissière (ou le serveur) qui transmet les commandes en cuisine et qui gère leur statut à votre place, via un écran partagé ou un bon de commande imprimé.
          </div>
        </div>
      ),
    },
    {
      id: 'reservations',
      num: 7,
      title: 'Les réservations, pas à pas',
      roles: ['manager', 'serveur'],
      icon: Calendar,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <ol className="list-decimal pl-5 space-y-2 text-xs">
            <li>Ouvrez le module <strong>Réservations</strong> et sélectionnez la date souhaitée.</li>
            <li>Renseignez le nom du client, son téléphone, l'heure et le nombre de couverts.</li>
            <li>Attribuez une table disponible, ou cliquez sur <strong>« Suggérer une table adaptée »</strong> pour laisser le système vous proposer une table optimisée selon la taille du groupe.</li>
            <li>À l'arrivée du client, cliquez sur <strong>« Installer / Confirmer arrivée »</strong> : la table passe de <em>« Réservée »</em> à <em>« Occupée »</em> et vous pouvez immédiatement ouvrir sa commande.</li>
          </ol>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
            <span className="font-bold">En cas d'annulation :</span> Ouvrez la réservation concernée et annulez-la. La table liée redevient instantanément libre et disponible pour d'autres clients.
          </div>
        </div>
      ),
    },
    {
      id: 'stock',
      num: 8,
      title: 'La gestion du stock au quotidien',
      roles: ['manager', 'stock'],
      icon: Package,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>Chaque vente d'un plat déduit automatiquement</strong> les ingrédients utilisés de votre stock selon la fiche recette — vous n'avez rien à faire manuellement.</li>
            <li><strong>Quand un ingrédient atteint son seuil minimum</strong>, une alerte apparaît sur le tableau de bord du manager.</li>
            <li><strong>À chaque livraison d'un fournisseur</strong>, cliquez sur <em>« + Réception Livraison »</em> sur la fiche de l'ingrédient concerné : entrez la quantité reçue et le stock se met à jour immédiatement.</li>
          </ul>
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-900 text-xs">
            <span className="font-bold">Astuce —</span> Pensez à associer une recette à chaque nouveau plat ajouté au menu, sinon son impact sur le stock ne sera pas suivi.
          </div>
        </div>
      ),
    },
    {
      id: 'equipe',
      num: 9,
      title: "Gérer l'équipe et les plannings",
      roles: ['manager', 'all'],
      icon: Users,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>Le manager crée une fiche pour chaque employé (nom, rôle, contact) et lui attribue un <strong>planning hebdomadaire</strong> du Lundi au Dimanche.</li>
            <li>Chaque employé peut consulter son propre planning depuis son compte dans l'onglet <strong>« Mon Planning »</strong>.</li>
            <li>Les présences peuvent être pointées à la connexion ou saisies manuellement par le manager.</li>
            <li>L'historique des présences récapitule les heures travaillées pour <strong>faciliter le suivi et le calcul de la paie</strong> avec export CSV.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'rapports',
      num: 10,
      title: 'Comprendre les rapports',
      roles: ['manager', 'direction'],
      icon: BarChart3,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="p-2.5">Rapport</th>
                  <th className="p-2.5">Ce qu'il vous montre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">Chiffre d'affaires</td>
                  <td className="p-2.5 text-slate-600">Ventes par jour, semaine ou mois, avec comparaison à la période précédente (+/- %).</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">Plats les plus vendus</td>
                  <td className="p-2.5 text-slate-600">Classement des plats par nombre de ventes et CA généré, pour ajuster votre carte.</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">Performance du personnel</td>
                  <td className="p-2.5 text-slate-600">Chiffre d'affaires et nombre de commandes traitées par serveur, panier moyen.</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-slate-900">Historique des transactions</td>
                  <td className="p-2.5 text-slate-600">Détail de chaque paiement du jour, filtrable par serveur ou mode de règlement.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-600">
            Chaque rapport peut être exporté en <strong>PDF</strong> ou en <strong>CSV</strong>, par exemple pour le transmettre à votre comptable.
          </p>
        </div>
      ),
    },
    {
      id: 'impression',
      num: 11,
      title: 'Imprimer les tickets de caisse',
      roles: ['caisse', 'manager'],
      icon: Printer,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-1">Connecter l'imprimante (une seule fois)</h4>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs">
              <li>Allumez votre imprimante thermique Bluetooth et activez son mode appairage.</li>
              <li>Depuis le poste de caisse, cliquez sur <strong>« Connecter Imprimante Bluetooth »</strong> et recherchez les appareils disponibles.</li>
              <li>Sélectionnez votre imprimante dans la liste pour l'associer au poste de caisse.</li>
            </ol>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-1">Au quotidien</h4>
            <p className="text-xs text-slate-600">
              Une fois l'imprimante connectée, aucune manipulation supplémentaire n'est nécessaire : chaque clôture de table déclenche automatiquement l'impression du ticket, déjà mis en forme pour la largeur de votre imprimante (<strong>58 ou 80 mm</strong>).
            </p>
          </div>
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-amber-900 text-xs">
            <span className="font-bold">Astuce —</span> En cas de besoin d'un duplicata, retrouvez la transaction dans l'historique de caisse et relancez l'impression en 1 clic.
          </div>
        </div>
      ),
    },
    {
      id: 'faq',
      num: 12,
      title: 'Questions fréquentes',
      roles: ['all'],
      icon: HelpCircle,
      content: (
        <div className="space-y-3 text-slate-700 text-xs sm:text-sm">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-1">Puis-je gérer plusieurs commandes en même temps sur plusieurs tables ?</div>
            <p className="text-xs text-slate-600">
              Oui. En tant que serveur, votre écran liste toutes vos tables actives ; vous pouvez passer de l'une à l'autre à tout moment.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-1">Que se passe-t-il si nous n'avons pas de cuisinier avec un compte sur le système ?</div>
            <p className="text-xs text-slate-600">
              Le manager active le mode <em>« Sans compte cuisinier »</em> dans les paramètres du restaurant. C'est alors la caissière (ou le serveur) qui transmet les commandes en cuisine et qui suit leur statut à la place d'un compte Cuisinier dédié.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-1">Le ticket imprimé est-il différent d'une facture normale ?</div>
            <p className="text-xs text-slate-600">
              Non, il contient les mêmes informations légales camerounaises (articles, total, TVA/CAC, NIU, mode de paiement), simplement mis en forme pour la largeur étroite d'une imprimante thermique portable (58 ou 80 mm).
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-xs mb-1">Un employé peut-il voir les données d'un autre restaurant ?</div>
            <p className="text-xs text-slate-600">
              Non. Chaque compte est strictement rattaché à son restaurant ; il est techniquement impossible de voir les données d'un autre établissement.
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
            <div>
              <div className="font-bold">Qui puis-je contacter en cas de problème ?</div>
              <div>Contactez votre manager ou l'administrateur système pour toute question sur la plateforme.</div>
            </div>
            <div className="text-right font-mono text-[11px] text-amber-800 font-bold shrink-0 ml-3">
              Support Interne
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter((s) => {
    const matchesRole =
      selectedRole === 'all' ||
      s.roles.includes('all') ||
      s.roles.includes(selectedRole);
    const matchesSearch =
      !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.num.toString() === searchTerm.trim();
    return matchesRole && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  GUIDE D'UTILISATION
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Édition Septembre 2026
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Manuel pratique pour les propriétaires, managers et équipes en salle, cuisine et caisse • RestoMaster OS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and search */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold bg-white p-1 rounded-xl border border-slate-200">
            {[
              { id: 'all', label: 'Tout le guide' },
              { id: 'manager', label: 'Propriétaire / Manager' },
              { id: 'serveur', label: 'Serveur' },
              { id: 'caisse', label: 'Caissier' },
              { id: 'cuisine', label: 'Cuisinier' },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  selectedRole === r.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher dans le guide..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
            />
          </div>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-100/50">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Aucune section trouvée pour cette recherche.</p>
            </div>
          ) : (
            filteredSections.map((sec) => {
              const IconComp = sec.icon;
              return (
                <div
                  key={sec.id}
                  id={sec.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3.5 pb-2.5 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 font-black text-sm flex items-center justify-center border border-amber-200">
                      {sec.num}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        <span>{sec.title}</span>
                      </h3>
                    </div>
                    <IconComp className="w-4 h-4 text-slate-400" />
                  </div>
                  {sec.content}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">RestoMaster OS</span>
            <span>•</span>
            <span className="text-slate-400">Système Intégré de Gestion de Restaurant</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
