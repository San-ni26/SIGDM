-- ============================================================================
-- INDEX DE PERFORMANCE - SIGDM MALI
-- ============================================================================
-- À exécuter sur la base de données PostgreSQL pour optimiser les performances

-- Index pour les recherches de trajets par véhicule
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_vehicle_id ON "Trip"("vehicleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_driver_id ON "Trip"("driverId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_declare_par ON "Trip"("declareParCitoyenId");

-- Index pour les filtres de date sur les trajets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_date_depart ON "Trip"("dateDepart");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_statut ON "Trip"("statut");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_created_at ON "Trip"("createdAt" DESC);

-- Index composite pour les filtres combinés trajets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_statut_date ON "Trip"("statut", "dateDepart");

-- Index pour les passages (timestamp pour les stats)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_passage_timestamp ON "Passage"("timestampPassage" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_passage_agent_id ON "Passage"("agentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_passage_poste_id ON "Passage"("posteId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_passage_trip_id ON "Passage"("tripId");

-- Index pour les anomalies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomaly_created_at ON "Anomaly"("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomaly_poste_id ON "Anomaly"("posteId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomaly_agent_id ON "Anomaly"("agentSignaleId");

-- Index pour les véhicules
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_plaque ON "Vehicle"("plaque");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_proprietaire ON "Vehicle"("proprietaireCitoyenId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicle_type ON "Vehicle"("typeVehicle");

-- Index pour les citoyens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citoyen_matricule ON "Citoyen"("matricule");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_citoyen_user_id ON "Citoyen"("userId");

-- Index pour les postes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poste_region ON "Poste"("region");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poste_ville ON "Poste"("ville");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poste_statut ON "Poste"("statut");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_poste_type ON "Poste"("type");

-- Index pour les agents
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_user_id ON "Agent"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_poste_id ON "Agent"("posteId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_type ON "Agent"("typeAgent");

-- Index pour les entreprises et compagnies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entreprise_user_id ON "Entreprise"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compagnie_user_id ON "Compagnie"("userId");

-- Index pour les passagers de trajets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_passager_trip_id ON "PassagerTrip"("tripId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_passager_citoyen_id ON "PassagerTrip"("citoyenId");

-- Index pour les employés chauffeurs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employe_entreprise_id ON "EmployeChauffeur"("entrepriseId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employe_citoyen_id ON "EmployeChauffeur"("citoyenId");

-- Index pour les logs d'audit
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_id ON "AuditLog"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at ON "AuditLog"("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity ON "AuditLog"("entityType", "entityId");

-- Index pour les sessions utilisateurs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_session_user_id ON "UserSession"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_session_expires ON "UserSession"("expiresAt");

-- ============================================================================
-- STATISTIQUES ET MAINTENANCE
-- ============================================================================

-- Mettre à jour les statistiques pour l'optimiseur de requêtes
ANALYZE "Trip";
ANALYZE "Passage";
ANALYZE "Anomaly";
ANALYZE "Vehicle";
ANALYZE "Citoyen";
ANALYZE "Poste";
ANALYZE "Agent";

-- Vérifier les index créés
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
