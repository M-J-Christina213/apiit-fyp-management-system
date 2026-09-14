const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSchemaUpdates() {
    try {
        console.log("=== APPLYING SAFE DB SCHEMA UPDATES ===");
        await prisma.$executeRawUnsafe(`ALTER TABLE "microsoft_integrations" DROP CONSTRAINT IF EXISTS "microsoft_integrations_admin_email_key";`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "microsoft_integrations" ADD COLUMN IF NOT EXISTS "user_id" INT UNIQUE REFERENCES "users"("id") ON DELETE CASCADE;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "microsoft_integrations" ADD COLUMN IF NOT EXISTS "microsoft_email" VARCHAR(150);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "microsoft_integrations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "viva_outlook_events" (
                "id" SERIAL PRIMARY KEY,
                "viva_schedule_id" INT NOT NULL REFERENCES "viva_schedules"("id") ON DELETE CASCADE,
                "user_id" INT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "outlook_event_id" VARCHAR(255) NOT NULL,
                "sync_status" VARCHAR(30) DEFAULT 'SYNCED',
                "sync_error" TEXT,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "viva_outlook_events_viva_schedule_id_user_id_key" UNIQUE ("viva_schedule_id", "user_id")
            );
        `);

        console.log("=== SCHEMA UPDATES APPLIED SUCCESSFULLY ===");
    } catch (e) {
        console.error("Schema Update Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runSchemaUpdates();
