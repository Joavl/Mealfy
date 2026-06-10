CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

CREATE TABLE "Entities" (
    "Id" uuid NOT NULL,
    "Name" text NOT NULL,
    "Cnpj" text NOT NULL,
    "Type" integer NOT NULL,
    "ResponsibleName" text NOT NULL,
    "Email" text NOT NULL,
    "Phone" text NOT NULL,
    "Region" text NOT NULL,
    "AddressOrDistrict" text,
    "WebsiteOrInstagram" text,
    "ShortDescription" text,
    "Status" integer NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Entities" PRIMARY KEY ("Id")
);

CREATE TABLE "Families" (
    "Id" uuid NOT NULL,
    "RepresentativeName" text NOT NULL,
    "FamilyName" text,
    "ResponsibleCpf" text,
    "ChildrenNamesJson" text,
    "PhotoUrl" text,
    "Description" text,
    "ShortAddress" text,
    "MainNeed" text,
    "PriorityLevel" integer NOT NULL,
    "NeedsEntitySupport" boolean NOT NULL,
    "Region" text NOT NULL,
    "Neighborhood" text,
    "City" text,
    "State" text,
    "ChildrenCount" integer NOT NULL,
    "Status" integer NOT NULL,
    "SupportStatus" integer NOT NULL,
    "LastFedAt" timestamp with time zone,
    "CreatedByEntityId" uuid,
    "SourceType" text NOT NULL,
    "SourceLabel" text NOT NULL,
    "OriginalIndicationId" uuid,
    "Latitude" double precision NOT NULL,
    "Longitude" double precision NOT NULL,
    "IvcadScore" real,
    "IsDeleted" boolean NOT NULL,
    "InternalRef" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Families" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Families_Entities_CreatedByEntityId" FOREIGN KEY ("CreatedByEntityId") REFERENCES "Entities" ("Id") ON DELETE SET NULL
);

CREATE TABLE "Users" (
    "Id" uuid NOT NULL,
    "Name" text NOT NULL,
    "Email" text NOT NULL,
    "Role" integer NOT NULL,
    "Status" integer NOT NULL,
    "EntityId" uuid,
    "BeneficiaryId" uuid,
    "Phone" text,
    "DocumentType" text,
    "DocumentNumber" text,
    "Instagram" text,
    "Facebook" text,
    "FirebaseUid" text,
    "TotalDonated" numeric(18,2) NOT NULL,
    "ShowOnRanking" boolean NOT NULL,
    "ShowInstagram" boolean NOT NULL,
    "AnonymousMode" boolean NOT NULL,
    "PreferredRegion" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    "UpdatedAt" timestamp with time zone,
    CONSTRAINT "PK_Users" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Users_Entities_EntityId" FOREIGN KEY ("EntityId") REFERENCES "Entities" ("Id")
);

CREATE TABLE "FamilyValidations" (
    "Id" uuid NOT NULL,
    "FamilyId" uuid NOT NULL,
    "Source" integer NOT NULL,
    "Verified" boolean NOT NULL,
    "CheckedAt" timestamp with time zone,
    "Notes" text,
    CONSTRAINT "PK_FamilyValidations" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_FamilyValidations_Families_FamilyId" FOREIGN KEY ("FamilyId") REFERENCES "Families" ("Id") ON DELETE CASCADE
);

CREATE TABLE "AuditLogs" (
    "Id" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Action" character varying(100) NOT NULL,
    "EntityType" character varying(50) NOT NULL,
    "EntityId" uuid NOT NULL,
    "PreviousValue" jsonb,
    "NewValue" jsonb,
    "Reason" text,
    "IpAddress" character varying(45),
    "UserAgent" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AuditLogs_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE "Donations" (
    "Id" uuid NOT NULL,
    "DonorId" uuid NOT NULL,
    "FamilyId" uuid NOT NULL,
    "Amount" numeric(18,2) NOT NULL,
    "CommunityId" text,
    "Message" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_Donations" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Donations_Families_FamilyId" FOREIGN KEY ("FamilyId") REFERENCES "Families" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Donations_Users_DonorId" FOREIGN KEY ("DonorId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Indications" (
    "Id" uuid NOT NULL,
    "RepresentativeName" text NOT NULL,
    "Region" text NOT NULL,
    "ChildrenCount" integer NOT NULL,
    "Observation" text NOT NULL,
    "Contact" text,
    "IndicatedByUserId" uuid NOT NULL,
    "Status" integer NOT NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "ConvertedFamilyId" uuid,
    "ConvertedAt" timestamp with time zone,
    "ConvertedByUserId" uuid,
    CONSTRAINT "PK_Indications" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Indications_Users_IndicatedByUserId" FOREIGN KEY ("IndicatedByUserId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE TABLE "GiftCards" (
    "Id" uuid NOT NULL,
    "DonationId" uuid NOT NULL,
    "FamilyId" uuid NOT NULL,
    "DonorId" uuid NOT NULL,
    "Amount" numeric(18,2) NOT NULL,
    "Provider" text NOT NULL,
    "Code" text NOT NULL,
    "Label" text NOT NULL,
    "Status" integer NOT NULL,
    "Message" text,
    "CreatedAt" timestamp with time zone NOT NULL,
    "RedeemedAt" timestamp with time zone,
    CONSTRAINT "PK_GiftCards" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_GiftCards_Donations_DonationId" FOREIGN KEY ("DonationId") REFERENCES "Donations" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_GiftCards_Families_FamilyId" FOREIGN KEY ("FamilyId") REFERENCES "Families" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_GiftCards_Users_DonorId" FOREIGN KEY ("DonorId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_AuditLogs_EntityType_EntityId" ON "AuditLogs" ("EntityType", "EntityId");

CREATE INDEX "IX_AuditLogs_UserId_CreatedAt" ON "AuditLogs" ("UserId", "CreatedAt");

CREATE INDEX "IX_Donations_DonorId" ON "Donations" ("DonorId");

CREATE INDEX "IX_Donations_FamilyId" ON "Donations" ("FamilyId");

CREATE INDEX "IX_Entities_Cnpj" ON "Entities" ("Cnpj");

CREATE INDEX "IX_Entities_Email" ON "Entities" ("Email");

CREATE INDEX "IX_Families_CreatedByEntityId" ON "Families" ("CreatedByEntityId");

CREATE UNIQUE INDEX "IX_FamilyValidations_FamilyId_Source" ON "FamilyValidations" ("FamilyId", "Source");

CREATE UNIQUE INDEX "IX_GiftCards_DonationId" ON "GiftCards" ("DonationId");

CREATE INDEX "IX_GiftCards_DonorId" ON "GiftCards" ("DonorId");

CREATE INDEX "IX_GiftCards_FamilyId" ON "GiftCards" ("FamilyId");

CREATE UNIQUE INDEX "IX_Indications_ConvertedFamilyId" ON "Indications" ("ConvertedFamilyId");

CREATE INDEX "IX_Indications_IndicatedByUserId" ON "Indications" ("IndicatedByUserId");

CREATE INDEX "IX_Indications_Status_CreatedAt" ON "Indications" ("Status", "CreatedAt");

CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");

CREATE INDEX "IX_Users_EntityId" ON "Users" ("EntityId");

CREATE INDEX "IX_Users_FirebaseUid" ON "Users" ("FirebaseUid");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260610040122_InitialPostgreSql', '8.0.11');

COMMIT;

