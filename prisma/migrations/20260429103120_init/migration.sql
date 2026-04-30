-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('SUPER_ADMIN', 'AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE', 'ENTREPRISE', 'COMPAGNIE', 'CITOYEN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU', 'EN_ATTENTE');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('CONTROLE', 'PEAGE', 'DOUANE', 'FRONTIERE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('VOITURE_PARTICULIERE', 'CAMION', 'CITERNE', 'BUS', 'CAR', 'MINIBUS', 'MOTO');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('EN_PREPARATION', 'EN_COURS', 'TERMINE', 'ANNULE', 'BLOQUE');

-- CreateEnum
CREATE TYPE "PassageStatus" AS ENUM ('EN_ATTENTE', 'VALIDE', 'ANOMALIE', 'REFUSE');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('PASSAGER_NON_DECLARE', 'PLAQUE_INCORRECTE', 'DOCUMENTS_MANQUANTS', 'SURCHARGE', 'MARCHANDISE_NON_DECLARE', 'CONDUITE_DANGEREUSE', 'FAUX_DOCUMENTS', 'VEHICULE_VOLE', 'AUTRE');

-- CreateEnum
CREATE TYPE "VerificationResult" AS ENUM ('CONFORME', 'ANOMALIE', 'REFUS');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATION', 'MODIFICATION', 'SUPPRESSION', 'CONNEXION', 'DECONNEXION', 'VALIDATION', 'DECLARATION', 'VERIFICATION', 'SIGNALEMENT', 'EXPORT', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "Genre" AS ENUM ('MASCULIN', 'FEMININ', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypePersonne" AS ENUM ('ADULTE', 'ENFANT');

-- CreateEnum
CREATE TYPE "TypePiece" AS ENUM ('CNI', 'PASSEPORT', 'CARTE_CONSULAIRE', 'PERMIS_SEJOUR');

-- CreateEnum
CREATE TYPE "NiveauAcces" AS ENUM ('NATIONAL', 'REGIONAL');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU', 'VOLE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('ACTIF', 'INACTIF', 'EN_TRAVAUX');

-- CreateEnum
CREATE TYPE "DeclarantType" AS ENUM ('CITOYEN', 'ENTREPRISE', 'COMPAGNIE');

-- CreateEnum
CREATE TYPE "SeveriteAnomalie" AS ENUM ('FAIBLE', 'MOYENNE', 'GRAVE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "StatutAnomalie" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'RESOLUE', 'REJETEE');

-- CreateEnum
CREATE TYPE "OfflineStatus" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'SYNCHRONISE', 'ERREUR');

-- CreateEnum
CREATE TYPE "ConfigType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'DATE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "user_type" "UserType" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_info" TEXT,
    "gps_latitude" DECIMAL(10,8),
    "gps_longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citoyens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "matricule" VARCHAR(5) NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "date_naissance" TIMESTAMP(3) NOT NULL,
    "lieu_naissance" TEXT NOT NULL,
    "genre" "Genre" NOT NULL,
    "type_personne" "TypePersonne" NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "photo_url" TEXT,
    "type_piece" "TypePiece",
    "numero_piece" TEXT,
    "piece_scan_url" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citoyens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "matricule_agent" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "type_agent" "UserType" NOT NULL,
    "grade" TEXT,
    "poste_id" TEXT,
    "photo_url" TEXT,
    "date_recrutement" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entreprises" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "raison_sociale" TEXT NOT NULL,
    "nif" TEXT,
    "registre_commerce" TEXT,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "nom_representant" TEXT NOT NULL,
    "telephone_representant" TEXT NOT NULL,
    "document_url" TEXT,
    "valide_par" TEXT,
    "date_validation" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entreprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compagnies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "raison_sociale" TEXT NOT NULL,
    "nif" TEXT,
    "registre_commerce" TEXT,
    "licence_transport" TEXT,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "nom_representant" TEXT NOT NULL,
    "telephone_representant" TEXT NOT NULL,
    "valide_par" TEXT,
    "date_validation" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compagnies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "niveau_acces" "NiveauAcces" NOT NULL DEFAULT 'NATIONAL',
    "region_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plaque" VARCHAR(20) NOT NULL,
    "type_vehicle" "VehicleType" NOT NULL,
    "carte_grise_numero" TEXT,
    "carte_grise_scan_url" TEXT,
    "marque" TEXT,
    "modele" TEXT,
    "annee_fabrication" INTEGER,
    "couleur" TEXT,
    "nombre_places" INTEGER,
    "proprietaire_citoyen_id" TEXT,
    "proprietaire_entreprise_id" TEXT,
    "proprietaire_compagnie_id" TEXT,
    "code_pin" VARCHAR(4),
    "assurance_url" TEXT,
    "visite_technique_url" TEXT,
    "statut" "VehicleStatus" NOT NULL DEFAULT 'ACTIF',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "adresse" TEXT,
    "ville" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "telephone" TEXT,
    "statut" "PostStatus" NOT NULL DEFAULT 'ACTIF',
    "heure_ouverture" TEXT,
    "heure_fermeture" TEXT,
    "capacite_journaliere" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "reference" VARCHAR(20) NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "declare_par_type" "DeclarantType" NOT NULL,
    "declare_par_citoyen_id" TEXT,
    "declare_par_entreprise_id" TEXT,
    "declare_par_compagnie_id" TEXT,
    "conducteur_id" TEXT,
    "driver_id" TEXT,
    "point_depart" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "depart_lat" DECIMAL(10,8),
    "depart_lng" DECIMAL(11,8),
    "destination_lat" DECIMAL(10,8),
    "destination_lng" DECIMAL(11,8),
    "date_depart" TIMESTAMP(3) NOT NULL,
    "date_arrivee_estimee" TIMESTAMP(3),
    "date_arrivee_reelle" TIMESTAMP(3),
    "type_marchandise" TEXT,
    "poids_marchandise" DECIMAL(65,30),
    "valeur_marchandise" DECIMAL(65,30),
    "documents_urls" TEXT,
    "statut" "TripStatus" NOT NULL DEFAULT 'EN_PREPARATION',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passager_trips" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "citoyen_id" TEXT NOT NULL,
    "matricule" VARCHAR(5) NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "type_personne" "TypePersonne" NOT NULL,
    "siege_numero" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passager_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passages" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "poste_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "timestamp_passage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_latitude" DECIMAL(10,8) NOT NULL,
    "agent_longitude" DECIMAL(11,8) NOT NULL,
    "gps_precision" DECIMAL(6,2),
    "distance_poste" DECIMAL(8,2),
    "statut" "PassageStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "duree_traitement" INTEGER,
    "observations" TEXT,
    "scan_documents" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT,
    "vehicle_id" TEXT,
    "poste_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "type" "AnomalyType" NOT NULL,
    "description" TEXT NOT NULL,
    "severite" "SeveriteAnomalie" NOT NULL DEFAULT 'MOYENNE',
    "preuves_urls" TEXT,
    "statut" "StatutAnomalie" NOT NULL DEFAULT 'EN_ATTENTE',
    "traite_par" TEXT,
    "date_traitement" TIMESTAMP(3),
    "notes_resolution" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT,
    "vehicle_id" TEXT,
    "poste_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "resultat" "VerificationResult" NOT NULL,
    "type_anomalie" "AnomalyType",
    "details" TEXT,
    "passagers_declares" INTEGER,
    "passagers_trouves" INTEGER,
    "documents_ok" BOOLEAN,
    "plaque_ok" BOOLEAN,
    "photos_urls" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "date_verification" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action_type" "AuditActionType" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "description" TEXT NOT NULL,
    "old_data" TEXT,
    "new_data" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "poste_id" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_post_stats" (
    "id" TEXT NOT NULL,
    "poste_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_passages" INTEGER NOT NULL DEFAULT 0,
    "passages_valides" INTEGER NOT NULL DEFAULT 0,
    "passages_anomalie" INTEGER NOT NULL DEFAULT 0,
    "passages_refuses" INTEGER NOT NULL DEFAULT 0,
    "total_anomalies" INTEGER NOT NULL DEFAULT 0,
    "anomalies_critiques" INTEGER NOT NULL DEFAULT 0,
    "temps_traitement_moyen" INTEGER,
    "agents_actifs" INTEGER NOT NULL DEFAULT 0,
    "voitures_count" INTEGER NOT NULL DEFAULT 0,
    "camions_count" INTEGER NOT NULL DEFAULT 0,
    "bus_count" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_post_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_national_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_trajets" INTEGER NOT NULL DEFAULT 0,
    "total_passages" INTEGER NOT NULL DEFAULT 0,
    "total_anomalies" INTEGER NOT NULL DEFAULT 0,
    "trajets_voitures" INTEGER NOT NULL DEFAULT 0,
    "trajets_camions" INTEGER NOT NULL DEFAULT 0,
    "trajets_bus" INTEGER NOT NULL DEFAULT 0,
    "passages_controle" INTEGER NOT NULL DEFAULT 0,
    "passages_peage" INTEGER NOT NULL DEFAULT 0,
    "passages_douane" INTEGER NOT NULL DEFAULT 0,
    "nouveaux_citoyens" INTEGER NOT NULL DEFAULT 0,
    "nouveaux_vehicules" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_national_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_performance" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total_passages" INTEGER NOT NULL DEFAULT 0,
    "passages_valides" INTEGER NOT NULL DEFAULT 0,
    "anomalies_detectees" INTEGER NOT NULL DEFAULT 0,
    "temps_traitement_moyen" INTEGER,
    "postes_count" INTEGER NOT NULL DEFAULT 0,
    "jours_presence" INTEGER NOT NULL DEFAULT 0,
    "score_performance" INTEGER,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_queue" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "local_timestamp" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "statut" "OfflineStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "erreur_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),
    "synced_entity_id" TEXT,

    CONSTRAINT "offline_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "type" "ConfigType" NOT NULL DEFAULT 'STRING',
    "description" TEXT,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_index" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "search_text" TEXT NOT NULL,
    "matricule" VARCHAR(5),
    "plaque" VARCHAR(20),
    "telephone" TEXT,
    "entity_date" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_index_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "citoyens_user_id_key" ON "citoyens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "citoyens_matricule_key" ON "citoyens"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "citoyens_telephone_key" ON "citoyens"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "agents_user_id_key" ON "agents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agents_matricule_agent_key" ON "agents"("matricule_agent");

-- CreateIndex
CREATE UNIQUE INDEX "agents_telephone_key" ON "agents"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "entreprises_user_id_key" ON "entreprises"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "entreprises_nif_key" ON "entreprises"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "compagnies_user_id_key" ON "compagnies"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "compagnies_nif_key" ON "compagnies"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "compagnies_licence_transport_key" ON "compagnies"("licence_transport");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_user_id_key" ON "super_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_telephone_key" ON "super_admins"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plaque_key" ON "vehicles"("plaque");

-- CreateIndex
CREATE UNIQUE INDEX "trips_reference_key" ON "trips"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "passager_trips_trip_id_citoyen_id_key" ON "passager_trips"("trip_id", "citoyen_id");

-- CreateIndex
CREATE INDEX "passages_trip_id_timestamp_passage_idx" ON "passages"("trip_id", "timestamp_passage");

-- CreateIndex
CREATE INDEX "passages_poste_id_timestamp_passage_idx" ON "passages"("poste_id", "timestamp_passage");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_created_at_idx" ON "audit_logs"("action_type", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "daily_post_stats_date_idx" ON "daily_post_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_post_stats_poste_id_date_key" ON "daily_post_stats"("poste_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_national_stats_date_key" ON "daily_national_stats"("date");

-- CreateIndex
CREATE INDEX "daily_national_stats_date_idx" ON "daily_national_stats"("date");

-- CreateIndex
CREATE INDEX "agent_performance_year_month_idx" ON "agent_performance"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "agent_performance_agent_id_year_month_key" ON "agent_performance"("agent_id", "year", "month");

-- CreateIndex
CREATE INDEX "offline_queue_agent_id_statut_idx" ON "offline_queue"("agent_id", "statut");

-- CreateIndex
CREATE INDEX "offline_queue_statut_tentatives_idx" ON "offline_queue"("statut", "tentatives");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_cle_key" ON "system_config"("cle");

-- CreateIndex
CREATE INDEX "search_index_search_text_idx" ON "search_index"("search_text");

-- CreateIndex
CREATE INDEX "search_index_matricule_idx" ON "search_index"("matricule");

-- CreateIndex
CREATE INDEX "search_index_plaque_idx" ON "search_index"("plaque");

-- CreateIndex
CREATE INDEX "search_index_telephone_idx" ON "search_index"("telephone");

-- CreateIndex
CREATE INDEX "search_index_entity_type_entity_date_idx" ON "search_index"("entity_type", "entity_date");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citoyens" ADD CONSTRAINT "citoyens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_poste_id_fkey" FOREIGN KEY ("poste_id") REFERENCES "postes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entreprises" ADD CONSTRAINT "entreprises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compagnies" ADD CONSTRAINT "compagnies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "super_admins" ADD CONSTRAINT "super_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_proprietaire_citoyen_id_fkey" FOREIGN KEY ("proprietaire_citoyen_id") REFERENCES "citoyens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_proprietaire_entreprise_id_fkey" FOREIGN KEY ("proprietaire_entreprise_id") REFERENCES "entreprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_proprietaire_compagnie_id_fkey" FOREIGN KEY ("proprietaire_compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_declare_par_citoyen_id_fkey" FOREIGN KEY ("declare_par_citoyen_id") REFERENCES "citoyens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_declare_par_entreprise_id_fkey" FOREIGN KEY ("declare_par_entreprise_id") REFERENCES "entreprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_declare_par_compagnie_id_fkey" FOREIGN KEY ("declare_par_compagnie_id") REFERENCES "compagnies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_conducteur_id_fkey" FOREIGN KEY ("conducteur_id") REFERENCES "citoyens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "citoyens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passager_trips" ADD CONSTRAINT "passager_trips_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passager_trips" ADD CONSTRAINT "passager_trips_citoyen_id_fkey" FOREIGN KEY ("citoyen_id") REFERENCES "citoyens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_poste_id_fkey" FOREIGN KEY ("poste_id") REFERENCES "postes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passages" ADD CONSTRAINT "passages_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_poste_id_fkey" FOREIGN KEY ("poste_id") REFERENCES "postes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_poste_id_fkey" FOREIGN KEY ("poste_id") REFERENCES "postes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
