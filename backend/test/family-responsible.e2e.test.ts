import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsedDatabaseUrl = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside the isolated local PostgreSQL database mealfy_e2e on 127.0.0.1.');

const { createApp } = require('../src/app') as typeof import('../src/app');
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
let server: http.Server | undefined;
let baseUrl: string;

async function cleanDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`;
  const quoted = tables.map(({ tablename }) => '"' + tablename.replaceAll('"', '""') + '"').join(', ');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + quoted + ' RESTART IDENTITY CASCADE');
}
async function capturedToken(email: string): Promise<string> {
  const dir = process.env.EMAIL_CAPTURE_DIR!;
  for (const file of await readdir(dir)) {
    const message = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as { kind: string; to: string; invitationToken?: string };
    if (message.kind === 'family_responsible_invitation' && message.to === email) return message.invitationToken!;
  }
  throw new Error('captured responsible invitation missing');
}
async function createEntity(suffix: string) {
  const user = await prisma.user.create({ data: { name: 'Entity '+suffix, email: 'entity-'+suffix+'@example.test', passwordHash: 'x', role: 'entity', status: 'active', emailVerifiedAt: new Date() } });
  const entity = await prisma.entity.create({ data: { userId: user.id, name: 'Entidade '+suffix, cnpj: '00.000.000/000'+suffix, responsibleName: 'Responsável', email: user.email, status: 'active' } });
  await prisma.entityOperatorMembership.create({ data: { entityId: entity.id, userId: user.id, permissions: ['families.write'] } });
  const { signToken } = require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');
  return { user, entity, token: signToken({ sub: user.id, role: 'entity', sv: user.sessionVersion }) };
}
async function createFamily(entityId: string, suffix: string) {
 return prisma.family.create({ data: { responsibleName: 'Responsável', displayName: 'Família '+suffix, entityId, city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
}
async function createResponsible(email: string) {
 const user=await prisma.user.create({data:{name:'Responsável',email,passwordHash:'x',role:'beneficiary',status:'active',emailVerifiedAt:new Date()}});
 const {signToken}=require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');
 return {user,token:signToken({sub:user.id,role:user.role,sv:user.sessionVersion})};
}
function invite(token:string,familyId:string,email:string,key='invite-'+Math.random()) { return fetch(baseUrl+'/direct-pix/families/'+familyId+'/responsible-invitations',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','idempotency-key':key},body:JSON.stringify({email})}); }
function accept(token:string,tokenValue:string,key='accept-'+Math.random()) { return fetch(baseUrl+'/direct-pix/family-responsible-invitations/accept',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','idempotency-key':key},body:JSON.stringify({token:tokenValue})}); }
function end(token:string,familyId:string,assignmentId:string,key='end-'+Math.random()) { return fetch(baseUrl+'/direct-pix/families/'+familyId+'/responsible-assignments/'+assignmentId+'/end',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','idempotency-key':key},body:JSON.stringify({endReason:'reassigned'})}); }

before(async()=>{ const ownership=await prisma.$queryRaw<Array<{run_id:string;database:string}>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`;assert.deepEqual(ownership,[{run_id:runId,database:'mealfy_e2e'}]); });
beforeEach(async()=>{await cleanDatabase();await new Promise<void>((resolve)=>{server=createApp().listen(0,'127.0.0.1',resolve);});baseUrl='http://127.0.0.1:'+((server!.address() as AddressInfo).port);});
afterEach(async()=>{if(server)await new Promise<void>((resolve,reject)=>server!.close((e)=>e?reject(e):resolve()));server=undefined;});
after(async()=>{await prisma.$disconnect();});

test('entity-owned approved family invitation is hash-only, accepts account-bound, and writes atomic audit/outbox',async()=>{
 const entity=await createEntity('001');const family=await createFamily(entity.entity.id,'one');const responsible=await createResponsible('responsible@example.test');
 const response=await invite(entity.token,family.id,responsible.user.email);assert.equal(response.status,201);const body=await response.json() as Record<string,unknown>;assert.equal(JSON.stringify(body).match(/token|hash|bearer/i),null);assert.equal(response.headers.get('cache-control'),'no-store');
 const token=await capturedToken(responsible.user.email);const accepted=await accept(responsible.token,token);assert.equal(accepted.status,201);const acceptedBody=await accepted.json() as {assignment:{familyId:string;responsibleUserId:string}};assert.equal(acceptedBody.assignment.familyId,family.id);assert.equal(acceptedBody.assignment.responsibleUserId,responsible.user.id);
 const [inviteRecord,assignment,audit,outbox]=await Promise.all([prisma.familyResponsibleInvitation.findFirstOrThrow(),prisma.familyResponsibleAssignment.findFirstOrThrow(),prisma.auditLog.count({where:{action:'direct_pix.family_responsible.invitation_accepted'}}),prisma.outboxEvent.count({where:{eventType:'direct_pix.family_responsible.assigned'}})]);
 assert.match(inviteRecord.tokenHash,/^[a-f0-9]{64}$/);assert.equal(inviteRecord.tokenHash===token,false);assert.equal(assignment.endedAt,null);assert.equal(audit,1);assert.equal(outbox,1);
 const own=await fetch(baseUrl+'/direct-pix/responsible/state',{headers:{authorization:'Bearer '+responsible.token}});assert.equal(own.status,200);assert.equal((await own.json() as {assignment:{familyId:string}}).assignment.familyId,family.id);
});

test('cross-entity operator cannot invite responsible for another entity family',async()=>{
 const owner=await createEntity('002');const other=await createEntity('003');const family=await createFamily(other.entity.id,'other');
 const response=await invite(owner.token,family.id,'not-owner@example.test');assert.equal(response.status,404);assert.equal((await response.json() as {code:string}).code,'family_not_found');assert.equal(await prisma.familyResponsibleInvitation.count(),0);
});

test('expired and replayed responsible invitation never assigns a family',async()=>{
 const entity=await createEntity('004');const family=await createFamily(entity.entity.id,'expired');const responsible=await createResponsible('expired@example.test');assert.equal((await invite(entity.token,family.id,responsible.user.email)).status,201);const token=await capturedToken(responsible.user.email);
 await prisma.familyResponsibleInvitation.updateMany({data:{expiresAt:new Date(Date.now()-1)}});const expired=await accept(responsible.token,token);assert.equal(expired.status,400);assert.equal((await expired.json() as {code:string}).code,'invalid_family_responsible_invitation');assert.equal(await prisma.familyResponsibleAssignment.count(),0);
 await prisma.familyResponsibleInvitation.updateMany({data:{expiresAt:new Date(Date.now()+60_000)}});const valid=await accept(responsible.token,token);assert.equal(valid.status,201);const replay=await accept(responsible.token,token);assert.equal(replay.status,400);assert.equal(await prisma.familyResponsibleAssignment.count(),1);
});

test('concurrent acceptance and cross-family assignment preserve exclusive cardinality',async()=>{
 const entity=await createEntity('005');const [first,second]=await Promise.all([createFamily(entity.entity.id,'first'),createFamily(entity.entity.id,'second')]);const responsible=await createResponsible('race@example.test');
 await Promise.all([invite(entity.token,first.id,responsible.user.email),invite(entity.token,second.id,responsible.user.email)]);const invitations=await prisma.familyResponsibleInvitation.findMany({orderBy:{createdAt:'asc'}});
 // Tokens are only in captured mail; pair requests race against the same account and distinct families.
 const files=await readdir(process.env.EMAIL_CAPTURE_DIR!);const tokens:string[]=[];for(const file of files){const m=JSON.parse(await readFile(path.join(process.env.EMAIL_CAPTURE_DIR!,file),'utf8'));if(m.kind==='family_responsible_invitation'&&m.to===responsible.user.email)tokens.push(m.invitationToken);}
 const responses=await Promise.all(tokens.map((value)=>accept(responsible.token,value)));assert.equal(responses.filter((r)=>r.status===201).length,1);assert.equal(await prisma.familyResponsibleAssignment.count({where:{endedAt:null}}),1);
 const assignment=await prisma.familyResponsibleAssignment.findFirstOrThrow({where:{endedAt:null}});assert.ok([first.id,second.id].includes(assignment.familyId));assert.equal(invitations.length,2);
});

test('invite replay is idempotent, conflicts on a canonical body mismatch, and active family rejects new invitations',async()=>{
 const entity=await createEntity('006');const family=await createFamily(entity.entity.id,'idempotency');const responsible=await createResponsible('idem@example.test');const key='invite-responsible-idempotency';
 const first=await invite(entity.token,family.id,responsible.user.email,key);assert.equal(first.status,201);const firstBody=await first.json() as {invitation:{id:string}};
 const replay=await invite(entity.token,family.id,responsible.user.email,key);assert.equal(replay.status,201);const replayBody=await replay.json() as {invitation:{id:string}};assert.equal(replayBody.invitation.id,firstBody.invitation.id);assert.equal(await prisma.familyResponsibleInvitation.count(),1);
 const conflict=await invite(entity.token,family.id,'different@example.test',key);assert.equal(conflict.status,409);assert.equal((await conflict.json() as {code:string}).code,'idempotency_conflict');
 const token=await capturedToken(responsible.user.email);assert.equal((await accept(responsible.token,token,'accept-idem')).status,201);
 const forbidden=await invite(entity.token,family.id,'new@example.test','invite-after-active');assert.equal(forbidden.status,409);assert.equal((await forbidden.json() as {code:string}).code,'family_responsible_already_assigned');
});

test('only a beneficiary may accept and acceptance replays exactly once',async()=>{
 const entity=await createEntity('007');const family=await createFamily(entity.entity.id,'roles');const responsible=await createResponsible('roles@example.test');await invite(entity.token,family.id,responsible.user.email,'invite-role');const token=await capturedToken(responsible.user.email);
 const donor=await prisma.user.create({data:{name:'Donor',email:'donor-roles@example.test',passwordHash:'x',role:'donor',status:'active',emailVerifiedAt:new Date()}});const admin=await prisma.user.create({data:{name:'Admin',email:'admin-roles@example.test',passwordHash:'x',role:'admin',status:'active',emailVerifiedAt:new Date()}});const {signToken}=require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');
 for(const user of [donor,entity.user,admin]){const denied=await accept(signToken({sub:user.id,role:user.role,sv:user.sessionVersion}),token,'role-'+user.id);assert.equal(denied.status,403);}
 const key='accept-replay';const first=await accept(responsible.token,token,key);assert.equal(first.status,201);const replay=await accept(responsible.token,token,key);assert.equal(replay.status,201);assert.equal(replay.headers.get('idempotency-replayed'),'true');assert.equal(await prisma.familyResponsibleAssignment.count(),1);
});

test('end is owner-scoped, preserves history, revokes stale pending invites, and replays idempotently',async()=>{
 const owner=await createEntity('008');const other=await createEntity('009');const family=await createFamily(owner.entity.id,'end');const foreignFamily=await createFamily(other.entity.id,'foreign-end');const responsible=await createResponsible('end@example.test');const pending=await createResponsible('pending@example.test');
 await invite(owner.token,family.id,responsible.user.email,'invite-end-active');const activeToken=await capturedToken(responsible.user.email);assert.equal((await accept(responsible.token,activeToken,'accept-end')).status,201);const assignment=await prisma.familyResponsibleAssignment.findFirstOrThrow({where:{familyId:family.id,endedAt:null}});
 // Pending invitation exists before closure and must become unusable in the same transition.
 const staleToken='s'.repeat(43);const staleInvitation=await prisma.familyResponsibleInvitation.create({data:{familyId:family.id,email:pending.user.email,tokenHash:createHash('sha256').update(staleToken).digest('hex'),invitedByUserId:owner.user.id,expiresAt:new Date(Date.now()+60_000)}});
 const bola=await end(other.token,family.id,assignment.id,'end-bola');assert.equal(bola.status,404);const foreign=await end(owner.token,foreignFamily.id,assignment.id,'end-foreign');assert.equal(foreign.status,404);
 const key='end-history';const ended=await end(owner.token,family.id,assignment.id,key);assert.equal(ended.status,200);const replay=await end(owner.token,family.id,assignment.id,key);assert.equal(replay.status,200);assert.equal(replay.headers.get('idempotency-replayed'),'true');
 const history=await prisma.familyResponsibleAssignment.findUniqueOrThrow({where:{id:assignment.id}});assert.ok(history.endedAt);assert.equal(history.endReason,'reassigned');assert.ok((await prisma.familyResponsibleInvitation.findUniqueOrThrow({where:{id:staleInvitation.id}})).revokedAt);const stale=await accept(pending.token,staleToken,'stale-after-end');assert.equal(stale.status,400);assert.equal((await stale.json() as {code:string}).code,'invalid_family_responsible_invitation');
});
