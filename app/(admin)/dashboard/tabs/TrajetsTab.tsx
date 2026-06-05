'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Users, Car, AlertTriangle, Clock, Search, ChevronLeft, ChevronRight,
  Filter, Eye, Calendar, RefreshCw, X, Shield, Info, Bus, CheckCircle2, AlertOctagon, ArrowRight, Flag, FileText
} from 'lucide-react';

// Chargement dynamique de la carte pour éviter les erreurs SSR de Leaflet
const TripMap = dynamic(() => import('./components/TripMap'), { ssr: false });

interface Passager {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  typePersonne: string;
  siegeNumero: number | null;
  createdAt: string;
}

interface Passage {
  id: string;
  timestampPassage: string;
  statut: string;
  agentLatitude: number;
  agentLongitude: number;
  observations: string | null;
  poste: { nom: string; type: string };
  agent: { nom: string; prenom: string; matriculeAgent: string };
}

interface Anomalie {
  id: string;
  type: string;
  statut: string;
  description: string;
  createdAt: string;
}

interface Trip {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  departLat: number | null;
  departLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  dateDepart: string;
  dateArriveeEstimee: string | null;
  dateArriveeReelle: string | null;
  statut: string;
  notes: string | null;
  createdAt: string;
  vehicle: {
    id: string;
    plaque: string;
    typeVehicle: string;
    marque: string;
    modele: string;
    nombrePlaces: number;
    proprietaireCitoyen?: { nom: string; prenom: string } | null;
    proprietaireEntreprise?: { raisonSociale: string } | null;
    proprietaireCompagnie?: { raisonSociale: string } | null;
  };
  conducteur?: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
    telephone: string;
  } | null;
  passagers: Passager[];
  passages: Passage[];
  anomalies: Anomalie[];
  _count: {
    passagers: number;
    passages: number;
    anomalies: number;
  };
}

interface AuditLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  description: string;
  oldData: string | null;
  newData: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  user: {
    id: string;
    userType: string;
    email: string | null;
    citoyen: { nom: string; prenom: string; matricule: string } | null;
    agent: { nom: string; prenom: string; matriculeAgent: string } | null;
    superAdmin: { nom: string; prenom: string } | null;
  };
}

const downloadTripPDF = (trip: Trip, auditLogs: AuditLog[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const passagesHtml = trip.passages.length > 0
    ? trip.passages.map(p => `
        <tr>
          <td>${p.poste.nom}</td>
          <td>${new Date(p.timestampPassage).toLocaleString('fr-FR')}</td>
          <td>${p.agent.prenom} ${p.agent.nom} (${p.agent.matriculeAgent})</td>
          <td>${p.observations || 'Néant'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="text-center italic">Aucun passage enregistré</td></tr>';

  const passagersHtml = trip.passagers.length > 0
    ? trip.passagers.map((p, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${p.prenom} ${p.nom}</td>
          <td class="font-mono">${p.matricule}</td>
          <td class="text-center font-bold">${p.siegeNumero || '-'}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="text-center italic">Aucun passager enregistré</td></tr>';

  const auditHtml = auditLogs.length > 0
    ? auditLogs.map(log => {
        const userLabel = log.user.superAdmin 
          ? `${log.user.superAdmin.prenom} ${log.user.superAdmin.nom} (Admin)`
          : log.user.agent 
          ? `${log.user.agent.prenom} ${log.user.agent.nom} [${log.user.agent.matriculeAgent}]`
          : log.user.citoyen 
          ? `${log.user.citoyen.prenom} ${log.user.citoyen.nom} [${log.user.citoyen.matricule}]`
          : log.user.email || log.user.id;

        return `
          <div class="audit-item">
            <div class="audit-meta">
              <span class="audit-type">${log.actionType}</span>
              <span class="audit-date">${new Date(log.createdAt).toLocaleString('fr-FR')}</span>
            </div>
            <p class="audit-desc">${log.description}</p>
            ${log.latitude && log.longitude ? `<p class="audit-gps">📍 Coordonnées : ${Number(log.latitude).toFixed(5)}, ${Number(log.longitude).toFixed(5)}</p>` : ''}
            <p class="audit-by">Par : ${userLabel} (${log.user.userType})</p>
          </div>
        `;
      }).join('')
    : '<p class="italic text-center">Aucune trace d\'audit enregistrée</p>';

  const anomaliesHtml = trip.anomalies.length > 0
    ? trip.anomalies.map(a => `
        <div class="anomaly-item">
          <div class="anomaly-header">
            <strong>${a.type}</strong>
            <span class="anomaly-status">${a.statut}</span>
          </div>
          <p>${a.description}</p>
          <p class="anomaly-date">Signalé le : ${new Date(a.createdAt).toLocaleString('fr-FR')}</p>
        </div>
      `).join('')
    : '<p class="italic">Aucune anomalie signalée</p>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Feuille de Route - ${trip.reference}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1e293b;
          font-size: 11pt;
          line-height: 1.4;
          margin: 0;
          padding: 0;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header-title h1 {
          font-size: 18pt;
          margin: 0;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-title p {
          margin: 4px 0 0 0;
          font-size: 10pt;
          color: #64748b;
        }
        .header-meta {
          text-align: right;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          font-size: 8pt;
          font-weight: bold;
          border-radius: 4px;
          text-transform: uppercase;
          border: 1px solid #cbd5e1;
        }
        .badge-active { background-color: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
        .badge-done { background-color: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .badge-prep { background-color: #fef9c3; color: #854d0e; border-color: #fef08a; }
        .badge-cancel { background-color: #fee2e2; color: #991b1b; border-color: #fecaca; }
        
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
        }
        .card h3 {
          margin: 0 0 8px 0;
          font-size: 10pt;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 9.5pt;
          margin-bottom: 6px;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .info-label {
          color: #64748b;
          font-weight: 500;
        }
        .info-value {
          font-weight: 600;
          color: #0f172a;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 9.5pt;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: bold;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: monospace; font-size: 9pt; }
        
        .audit-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .audit-item {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          font-size: 9pt;
        }
        .audit-meta {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .audit-type {
          color: #2563eb;
        }
        .audit-date {
          color: #64748b;
        }
        .audit-desc {
          margin: 0;
          color: #334155;
        }
        .audit-gps {
          margin: 4px 0 0 0;
          color: #ea580c;
          font-weight: 500;
        }
        .audit-by {
          margin: 4px 0 0 0;
          font-size: 8pt;
          color: #94a3b8;
          text-align: right;
        }
        
        .anomaly-item {
          background-color: #fff1f2;
          border: 1px solid #fecdd3;
          color: #9f1239;
          border-radius: 6px;
          padding: 10px;
          font-size: 9pt;
          margin-bottom: 8px;
        }
        .anomaly-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .anomaly-status {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 8pt;
        }
        .anomaly-date {
          margin: 4px 0 0 0;
          font-size: 8pt;
          color: #be123c;
          text-align: right;
        }
        
        .footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          text-align: center;
          font-size: 8pt;
          color: #94a3b8;
          page-break-inside: avoid;
        }
        .signatures {
          margin-top: 40px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
          page-break-inside: avoid;
        }
        .signature-box {
          border-top: 1px dashed #94a3b8;
          padding-top: 8px;
          text-align: center;
          font-size: 9pt;
          color: #64748b;
          height: 60px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <h1>Feuille de Route Officielle</h1>
          <p>Système National de Traçabilité des Transports · Référence : <strong>${trip.reference}</strong></p>
        </div>
        <div class="header-meta">
          <div class="badge ${
            trip.statut === 'TERMINE' ? 'badge-done' : 
            trip.statut === 'EN_COURS' ? 'badge-active' : 
            trip.statut === 'EN_PREPARATION' ? 'badge-prep' : 
            'badge-cancel'
          }">${trip.statut}</div>
          <p style="margin: 6px 0 0 0; font-size: 8.5pt; color: #64748b;">Généré le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Informations Générales</div>
        <div class="grid">
          <div class="card">
            <h3>Itinéraire & Dates</h3>
            <div class="info-row">
              <span class="info-label">Point de départ :</span>
              <span class="info-value">${trip.pointDepart}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Destination :</span>
              <span class="info-value">${trip.destination}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date de départ :</span>
              <span class="info-value">${new Date(trip.dateDepart).toLocaleString('fr-FR')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date d'arrivée réelle :</span>
              <span class="info-value">${trip.dateArriveeReelle ? new Date(trip.dateArriveeReelle).toLocaleString('fr-FR') : 'En cours/Non définie'}</span>
            </div>
          </div>
          
          <div class="card">
            <h3>Véhicule & Chauffeur</h3>
            <div class="info-row">
              <span class="info-label">Immatriculation :</span>
              <span class="info-value font-mono">${trip.vehicle.plaque}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Modèle :</span>
              <span class="info-value">${trip.vehicle.marque} ${trip.vehicle.modele} (${trip.vehicle.typeVehicle})</span>
            </div>
            <div class="info-row">
              <span class="info-label">Propriétaire :</span>
              <span class="info-value">${
                trip.vehicle.proprietaireCitoyen
                  ? `${trip.vehicle.proprietaireCitoyen.prenom} ${trip.vehicle.proprietaireCitoyen.nom}`
                  : trip.vehicle.proprietaireEntreprise
                  ? trip.vehicle.proprietaireEntreprise.raisonSociale
                  : trip.vehicle.proprietaireCompagnie
                  ? trip.vehicle.proprietaireCompagnie.raisonSociale
                  : 'Inconnu'
              }</span>
            </div>
            <div class="info-row">
              <span class="info-label">Chauffeur :</span>
              <span class="info-value">${trip.conducteur ? `${trip.conducteur.prenom} ${trip.conducteur.nom}` : 'Non assigné'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Matricule Chauffeur :</span>
              <span class="info-value font-mono">${trip.conducteur ? trip.conducteur.matricule : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      ${trip.anomalies.length > 0 ? `
        <div class="section">
          <div class="section-title" style="color: #be123c;">Anomalies Signalées (${trip.anomalies.length})</div>
          <div>${anomaliesHtml}</div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Manifeste des Passagers (${trip.passagers.length} enregistré(s))</div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;" class="text-center">N°</th>
              <th style="width: 52%;">Nom & Prénom</th>
              <th style="width: 25%;">Matricule Citoyen</th>
              <th style="width: 15%;" class="text-center">Siège</th>
            </tr>
          </thead>
          <tbody>
            ${passagersHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Points de Contrôle Passés (${trip.passages.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Poste</th>
              <th style="width: 25%;">Heure de Passage</th>
              <th style="width: 25%;">Agent</th>
              <th style="width: 25%;">Observations</th>
            </tr>
          </thead>
          <tbody>
            ${passagesHtml}
          </tbody>
        </table>
      </div>

      <div class="section" style="page-break-before: always;">
        <div class="section-title">Journal d'Audit Immuable (Journal de Sécurité)</div>
        <div class="audit-list">
          ${auditHtml}
        </div>
      </div>

      <div class="signatures">
        <div class="signature-box">Signature de l'Agent de Contrôle</div>
        <div class="signature-box">Cachet / Visa de l'Administration</div>
      </div>

      <div class="footer">
        <p>Document officiel généré électroniquement par Transport-ML. Ce document fait foi de preuve d'audit de trajet.</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

const MONTHS = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export default function TrajetsTab() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState('24h');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({});

  // Trip selection & details
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'passages' | 'audit' | 'map'>('details');

  const getUserLabel = (user: AuditLog['user']) => {
    if (user.superAdmin) return `${user.superAdmin.prenom} ${user.superAdmin.nom} (Admin)`;
    if (user.agent) return `${user.agent.prenom} ${user.agent.nom} [${user.agent.matriculeAgent}]`;
    if (user.citoyen) return `${user.citoyen.prenom} ${user.citoyen.nom} [${user.citoyen.matricule}]`;
    return user.email || user.id;
  };

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        statut: statusFilter,
      });

      if (selectedMonth) {
        params.append('year', selectedYear);
        params.append('month', selectedMonth);
      } else {
        params.append('range', range);
      }

      const res = await fetch(`/api/admin/trajets?${params}`);
      if (!res.ok) throw new Error('Erreur lors du chargement des trajets');
      const data = await res.json();
      setTrips(data.data || []);
      setTotal(data.total || 0);
      setStats(data.stats || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, range, selectedMonth, selectedYear, search, statusFilter]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const loadTripAudit = async (tripId: string) => {
    try {
      setLoadingAudit(true);
      const res = await fetch(`/api/admin/trajets/${tripId}/audit`);
      if (!res.ok) throw new Error('Erreur d\'audit');
      const data = await res.json();
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setActiveDetailTab('details');
    loadTripAudit(trip.id);
  };

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
    setSelectedMonth(''); // Reset month filter if range is selected
    setPage(1);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EN_PREPARATION':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">Préparation</span>;
      case 'EN_COURS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">En Cours</span>;
      case 'TERMINE':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">Terminé</span>;
      case 'ANNULE':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">Annulé</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-50 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Supervision des Trajets</h2>
          <p className="text-sm text-slate-500">Consultez, filtrez et auditez tous les trajets en temps réel sur le territoire.</p>
        </div>

        <button
          onClick={loadTrips}
          disabled={loading}
          className="flex items-center gap-2 self-start px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Période</p>
            <p className="text-xl font-bold text-slate-800">{total}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">En cours</p>
            <p className="text-xl font-bold text-amber-600">{stats['EN_COURS'] || 0}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Terminés</p>
            <p className="text-xl font-bold text-green-600">{stats['TERMINE'] || 0}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Annulés</p>
            <p className="text-xl font-bold text-rose-600">{stats['ANNULE'] || 0}</p>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {/* Time filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
            <button
              onClick={() => handleRangeChange('24h')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${range === '24h' && !selectedMonth ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Dernières 24h
            </button>
            <button
              onClick={() => handleRangeChange('7d')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${range === '7d' && !selectedMonth ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Semaine
            </button>
            <button
              onClick={() => handleRangeChange('30d')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${range === '30d' && !selectedMonth ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Mois courant
            </button>
            <button
              onClick={() => handleRangeChange('all')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${range === 'all' && !selectedMonth ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Tous
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filtrer par mois de l'année :</span>
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  if (selectedMonth) setPage(1);
                }}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Sélectionner un mois --</option>
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher (Réf, Plaque, Ville...)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_PREPARATION">En préparation</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>

          <div className="flex items-center text-slate-400 text-xs gap-1">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>Le filtre mensuel l'emporte sur les plages de 24h/semaine/mois.</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Trips list */}
        <div className={`xl:col-span-2 space-y-4 ${selectedTrip ? 'hidden lg:block' : ''}`}>
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-slate-500 text-sm font-medium">Chargement des trajets...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Flag className="w-8 h-8" />
                </div>
                <p className="text-slate-700 font-semibold">Aucun trajet trouvé</p>
                <p className="text-slate-400 text-sm">Modifiez vos critères de recherche ou sélectionnez une autre période.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Référence</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Itinéraire</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Véhicule</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trips.map((trip) => (
                      <tr
                        key={trip.id}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedTrip?.id === trip.id ? 'bg-blue-50/30' : ''}`}
                        onClick={() => handleSelectTrip(trip)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-mono text-sm font-bold text-slate-700">{trip.reference}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {trip._count.passagers} passager{trip._count.passagers > 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-[180px] space-y-0.5">
                            <p className="text-sm font-medium text-slate-700 truncate">{trip.pointDepart}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                              <ArrowRight className="w-3 h-3 text-blue-500" />
                              <span>vers {trip.destination}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {trip.vehicle.plaque}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-1 capitalize truncate">
                              {trip.vehicle.marque} {trip.vehicle.modele}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-600">
                            <p>{new Date(trip.dateDepart).toLocaleDateString('fr-FR')}</p>
                            <p className="text-slate-400 mt-0.5">
                              {new Date(trip.dateDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            {getStatusBadge(trip.statut)}
                            {trip._count.anomalies > 0 && (
                              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                {trip._count.anomalies} anomalie{trip._count.anomalies > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTrip(trip);
                            }}
                            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > 10 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Affichage de {(page - 1) * 10 + 1} à {Math.min(page * 10, total)} sur {total} trajets
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page * 10 >= total}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50 text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected trip details / Audit panel */}
        <div className={`xl:col-span-1 ${!selectedTrip ? 'hidden xl:block' : ''}`}>
          {selectedTrip ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-md overflow-hidden flex flex-col max-h-[85vh] sticky top-24">
              {/* Header Details */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-blue-400">{selectedTrip.reference}</span>
                    {getStatusBadge(selectedTrip.statut)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 capitalize truncate">
                    Véhicule: {selectedTrip.vehicle.plaque} ({selectedTrip.vehicle.marque} {selectedTrip.vehicle.modele})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50 p-1">
                {(['details', 'passages', 'audit', 'map'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveDetailTab(t)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                      activeDetailTab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t === 'details' ? 'Détails' : t === 'passages' ? 'Passages' : t === 'audit' ? 'Audit' : 'Carte'}
                  </button>
                ))}
              </div>

              {/* Detail Content Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {activeDetailTab === 'details' && (
                  <div className="space-y-5">
                    {/* Infos Trajet */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itinéraire & Dates</h4>
                      <div className="p-3 bg-slate-50 rounded-xl space-y-3">
                        <div className="flex gap-2">
                          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Départ</p>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedTrip.pointDepart}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Destination</p>
                            <p className="text-xs text-slate-500 mt-0.5">{selectedTrip.destination}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block font-medium">Départ planifié :</span>
                            <span className="text-slate-700 font-semibold">{new Date(selectedTrip.dateDepart).toLocaleString('fr-FR')}</span>
                          </div>
                          {selectedTrip.dateArriveeReelle && (
                            <div>
                              <span className="text-slate-400 block font-medium">Arrivée réelle :</span>
                              <span className="text-slate-700 font-semibold">{new Date(selectedTrip.dateArriveeReelle).toLocaleString('fr-FR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Conducteur */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conducteur</h4>
                      {selectedTrip.conducteur ? (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                            {selectedTrip.conducteur.nom[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {selectedTrip.conducteur.prenom} {selectedTrip.conducteur.nom}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Matricule : {selectedTrip.conducteur.matricule} | Tél : {selectedTrip.conducteur.telephone}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucun chauffeur assigné</p>
                      )}
                    </div>

                    {/* Véhicule */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Véhicule</h4>
                      <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Marque & Modèle :</span>
                          <span className="font-semibold text-slate-700 capitalize">{selectedTrip.vehicle.marque} {selectedTrip.vehicle.modele}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Type :</span>
                          <span className="font-semibold text-slate-700 capitalize">{selectedTrip.vehicle.typeVehicle}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Places :</span>
                          <span className="font-semibold text-slate-700">{selectedTrip.vehicle.nombrePlaces} places</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Propriétaire :</span>
                          <span className="font-semibold text-slate-700">
                            {selectedTrip.vehicle.proprietaireCitoyen
                              ? `${selectedTrip.vehicle.proprietaireCitoyen.prenom} ${selectedTrip.vehicle.proprietaireCitoyen.nom}`
                              : selectedTrip.vehicle.proprietaireEntreprise
                              ? selectedTrip.vehicle.proprietaireEntreprise.raisonSociale
                              : selectedTrip.vehicle.proprietaireCompagnie
                              ? selectedTrip.vehicle.proprietaireCompagnie.raisonSociale
                              : 'Inconnu'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Passagers */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passagers ({selectedTrip.passagers.length})</h4>
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-bold">
                          Capacité : {Math.round((selectedTrip.passagers.length / selectedTrip.vehicle.nombrePlaces) * 100)}%
                        </span>
                      </div>
                      {selectedTrip.passagers.length > 0 ? (
                        <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                          {selectedTrip.passagers.map((p) => (
                            <div key={p.id} className="p-2.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs">
                              <div>
                                <p className="font-semibold text-slate-700">{p.prenom} {p.nom}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Matricule: {p.matricule}</p>
                              </div>
                              {p.siegeNumero && (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                                  Siège {p.siegeNumero}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Aucun passager enregistré</p>
                      )}
                    </div>

                    {/* Anomalies */}
                    {selectedTrip.anomalies.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Anomalies Signalées ({selectedTrip.anomalies.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedTrip.anomalies.map((a) => (
                            <div key={a.id} className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span className="uppercase">{a.type}</span>
                                <span className="text-[10px] font-semibold bg-rose-100 px-2 py-0.5 rounded-full">{a.statut}</span>
                              </div>
                              <p className="text-slate-600 leading-normal">{a.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeDetailTab === 'passages' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historique des Passages de Contrôle</h4>
                    {selectedTrip.passages.length > 0 ? (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                        {selectedTrip.passages.map((p) => (
                          <div key={p.id} className="relative text-xs">
                            {/* Dot indicator */}
                            <div className="absolute -left-[20px] top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white ring-4 ring-blue-50 shadow-sm" />
                            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700">{p.poste.nom}</span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {new Date(p.timestampPassage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">Poste type: <span className="capitalize">{p.poste.type}</span></p>
                              {p.observations && (
                                <p className="p-2 bg-white rounded border border-slate-100 text-slate-600 leading-relaxed">
                                  <strong>Obs :</strong> {p.observations}
                                </p>
                              )}
                              <div className="pt-1 text-[9px] text-slate-400/80 border-t border-slate-200/50">
                                Validé par : {p.agent.prenom} {p.agent.nom} [{p.agent.matriculeAgent}]
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucun passage enregistré à ce jour.</p>
                    )}
                  </div>
                )}

                {activeDetailTab === 'audit' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        Audit Complet (Trace Blockchain)
                      </h4>
                      {loadingAudit && <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
                    </div>

                    {loadingAudit ? (
                      <div className="py-12 text-center space-y-3">
                        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                        <p className="text-xs text-slate-500">Chargement de l'audit immutable...</p>
                      </div>
                    ) : auditLogs.length > 0 ? (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="relative text-xs">
                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 bg-slate-300 rounded-full border-2 border-white ring-4 ring-slate-100" />
                            <div className="p-2.5 bg-slate-50/60 hover:bg-slate-50 rounded-xl space-y-1.5 transition-colors">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-blue-600 uppercase tracking-wide">{log.actionType}</span>
                                <span className="text-slate-400">
                                  {new Date(log.createdAt).toLocaleString('fr-FR', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-normal font-medium">{log.description}</p>
                              {log.latitude && log.longitude && (
                                <div className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                  <MapPin className="w-3 h-3 text-orange-500" />
                                  <span>{Number(log.latitude).toFixed(5)}, {Number(log.longitude).toFixed(5)}</span>
                                </div>
                              )}
                              <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                                <span>Par: {getUserLabel(log.user)}</span>
                                <span className="uppercase text-[8px] bg-slate-200/80 px-1 rounded text-slate-600 font-bold">{log.user.userType}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucune trace d'audit trouvée pour ce trajet.</p>
                    )}
                  </div>
                )}

                {activeDetailTab === 'map' && (
                  <div className="h-[380px] w-full bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative">
                    <TripMap
                      passages={selectedTrip.passages.map(p => ({
                        id: p.id,
                        poste: {
                          nom: p.poste.nom,
                          latitude: Number(p.agentLatitude),
                          longitude: Number(p.agentLongitude)
                        },
                        timestampPassage: p.timestampPassage,
                        segmentSuivant: null
                      }))}
                      departLat={selectedTrip.departLat}
                      departLng={selectedTrip.departLng}
                      pointDepart={selectedTrip.pointDepart}
                      destinationLat={selectedTrip.destinationLat}
                      destinationLng={selectedTrip.destinationLng}
                      destination={selectedTrip.destination}
                      auditLogs={auditLogs.map(log => ({
                        id: log.id,
                        actionType: log.actionType,
                        entityType: log.entityType,
                        description: log.description,
                        latitude: log.latitude ? Number(log.latitude) : null,
                        longitude: log.longitude ? Number(log.longitude) : null,
                        createdAt: log.createdAt
                      }))}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => downloadTripPDF(selectedTrip, auditLogs)}
                  disabled={loadingAudit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  Télécharger PDF
                </button>
                <span className="font-semibold text-slate-700">Enregistré le {new Date(selectedTrip.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[300px]">
              <Flag className="w-12 h-12 mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">Aucun trajet sélectionné</p>
              <p className="text-xs max-w-xs mt-1">Sélectionnez un trajet dans la liste de gauche pour en voir les détails, la carte, et l'audit complet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
