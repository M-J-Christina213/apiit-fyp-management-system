// Restores schema only and writes synthetic fixtures ONLY into a local *_milestone_test DB.
// MILESTONE_TEST_DATABASE_URL and MILESTONE_LEGACY_SCHEMA are deliberately required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const testUrl = new URL(process.env.MILESTONE_TEST_DATABASE_URL || 'invalid:');
if (!['127.0.0.1', 'localhost'].includes(testUrl.hostname) || !testUrl.pathname.endsWith('_milestone_test')) {
    throw new Error('Use a dedicated local database ending in _milestone_test');
}
if (!process.env.MILESTONE_LEGACY_SCHEMA) throw new Error('Provide a schema-only legacy snapshot');
process.env.DATABASE_URL = testUrl.href;
process.env.AZURE_CLIENT_ID = '00000000-0000-0000-0000-000000000001';
process.env.AZURE_TENANT_ID = '00000000-0000-0000-0000-000000000002';
process.env.AZURE_CLIENT_SECRET = 'isolated-test-only';
process.env.TEMP_LOGIN_ENABLED = 'false';

async function main() {
    const db = new Client({ connectionString: testUrl.href });
    await db.connect();
    const schema = fs.readFileSync(process.env.MILESTONE_LEGACY_SCHEMA, 'utf8')
        .split('\n').filter(line => !line.startsWith('\\')).join('\n');
    await db.query('DROP SCHEMA public CASCADE');
    await db.query(schema);
    await db.query('SET search_path TO public');
    await db.query(`INSERT INTO batches(id,batch_code,batch_intake,start_fyp_date,stage) VALUES
        (61,'LEGACY','February 2024','2026-01-01','Proposal'),
        (69,'SENG2462','2027-nov','2027-11-10','Proposal'),
        (67,'AI2516','2024-feb','2024-07-06','Proposal'),
        (75,'SE24','February 2024','2026-02-01','Final'),
        (9001,'API-TEST','February 2024','2026-02-01','Proposal')`);
    await db.query(`INSERT INTO students(id,batch_id,student_name,cb_no) VALUES
        (1,61,'Legacy fixture','CB90001'),(2,67,'PM fixture','CB90002'),
        (3,75,'Admin fixture','CB90003'),(4,9001,'API fixture','CB90004')`);
    await db.query(`INSERT INTO milestones(id,batch_id,name,type,deadline,order_index) VALUES
        (1,61,'Legacy POC','FORMATIVE','2026-08-21 22:38:00',0),
        (2,69,'Legacy LR','SUMMATIVE','2026-09-06 06:00:00',1)`);
    await db.query("SELECT setval('milestones_id_seq',2)");
    await db.query("INSERT INTO student_milestone_status(student_id,milestone_id,status) VALUES(1,1,'Submitted')");
    for (const [id, role] of [[1, 'pm'], [2, 'admin']]) {
        await db.query('INSERT INTO users(id,name,email,password,role,is_active) VALUES($1,$2,$3,$4,$5,true)',
            [id, `${role} fixture`, `${role}@milestone-test.invalid`, bcrypt.hashSync('Test-only-Password-123!', 4), role]);
    }
    const legacySql = 'SELECT id,batch_id,name,description,type,deadline::text,order_index,created_at::text FROM milestones ORDER BY id';
    const legacy = (await db.query(legacySql)).rows;
    const progress = (await db.query('SELECT * FROM student_milestone_status ORDER BY id')).rows;
    const app = require('../server');
    const server = app.listen(Number(process.env.PORT || 5001), '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (route, method = 'GET', body, role = 'pm') => {
        const response = await fetch(base + route, { method, headers: {
            'Content-Type': 'application/json', 'x-user-role': role, 'x-user-email': `${role}@milestone-test.invalid`
        }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
    };
    const check = (condition, label) => { assert.ok(condition, label); console.log('PASS ' + label); };
    for (const id of [69, 67]) {
        const result = await request(`/milestones/batch/${id}`);
        check(result.status === 500 && result.data.details.includes('milestone_code'), `legacy read ${id} reproduces missing-column failure`);
    }
    const payload = { batch_id: 9001, name: 'API draft', type: 'SUMMATIVE', deadline: '2026-12-05T17:30', status: 'PUBLISHED' };
    check((await request('/milestones', 'POST', payload)).status === 500, 'legacy create also fails before migration');

    // The older pending SQL does not remove deadline NOT NULL. Prove it and roll back.
    await db.query('BEGIN');
    const oldMigration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261118_milestones_and_concurrent_marking.sql'), 'utf8');
    await db.query(oldMigration.slice(0, oldMigration.indexOf('-- 3.')));
    await assert.rejects(db.query("INSERT INTO milestones(batch_id,name,type,deadline) VALUES(9001,'TBC constraint check','FORMATIVE',NULL)"), { code: '23502' });
    await db.query('ROLLBACK');
    console.log('PASS older pending SQL leaves deadline NOT NULL (transaction rolled back)');

    const migration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261119090000_milestone_drafts/migration.sql'), 'utf8');
    await db.query(migration);
    await db.query(migration);
    assert.deepEqual((await db.query(legacySql)).rows, legacy);
    assert.deepEqual((await db.query('SELECT * FROM student_milestone_status ORDER BY id')).rows, progress);
    console.log('PASS exact migration is repeatable and preserves legacy fields and student progress');

    for (const role of ['pm', 'admin']) {
        const empty = await request('/milestones/batch/67', 'GET', undefined, role);
        check(empty.status === 200 && empty.data.length === 0, `${role} reads an existing empty batch as 200 []`);
        const legacyRead = await request('/milestones/batch/69', 'GET', undefined, role);
        check(legacyRead.status === 200 && legacyRead.data[0].name === 'Legacy LR' && legacyRead.data[0].status === 'PUBLISHED', `${role} reads preserved legacy milestone`);
    }
    check((await request('/milestones/batch/999999')).status === 404, 'unknown batch is not treated as verified empty');
    check((await request('/milestones', 'POST', { ...payload, batch_id: 999999 })).status === 404, 'create rejects unknown batch');
    check((await request('/milestones', 'POST', { ...payload, deadline: 'invalid' })).status === 400, 'create rejects an invalid deadline');
    check((await request('/milestones', 'POST', payload, 'student')).status === 403, 'student cannot create staff milestones');

    await db.query(`CREATE FUNCTION reject_test_progress() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated progress failure'; END $$;
        CREATE TRIGGER reject_test_progress BEFORE INSERT ON student_milestone_status FOR EACH ROW EXECUTE FUNCTION reject_test_progress()`);
    check((await request('/milestones', 'POST', payload)).status === 500, 'progress failure returns an error');
    check((await db.query('SELECT count(*)::int AS n FROM milestones WHERE batch_id=9001')).rows[0].n === 0, 'progress failure rolls back milestone instead of leaving a duplicate on retry');
    await db.query('DROP TRIGGER reject_test_progress ON student_milestone_status; DROP FUNCTION reject_test_progress()');

    for (const role of ['pm', 'admin']) {
        const created = await request('/milestones', 'POST', { ...payload, name: `${role} API draft` }, role);
        check(created.status === 201 && created.data.milestone.status === 'DRAFT', `${role} creates draft even if payload asks for published`);
        check(created.data.milestone.deadline === '2026-12-05T12:00:00.000Z' && created.data.milestone.colombo_input_deadline === '2026-12-05T17:30', `${role} Sri Lanka deadline round-trips correctly`);
    }
    const tbc = await request('/milestones', 'POST', { ...payload, name: 'TBC draft', deadline: null, is_date_tbc: true });
    check(tbc.status === 201 && tbc.data.milestone.deadline === null, 'TBC draft accepts a null deadline');
    check((await request('/milestones/batch/9001', 'GET', undefined, 'student')).data.length === 0, 'new drafts remain hidden from students');
    check((await request('/proposals/student/undefined')).status === 400, 'undefined student proposal ID is rejected');
    assert.deepEqual((await db.query(legacySql + ' LIMIT 2')).rows, legacy);
    await db.end();
    console.log('READY isolated API on ' + base + '; browser fixture batches 67 and 75 remain empty');
    if (!process.argv.includes('--serve')) {
        server.closeAllConnections();
        server.close(() => process.exit(0));
    }
}
main().catch(error => { console.error(error); process.exit(1); });
