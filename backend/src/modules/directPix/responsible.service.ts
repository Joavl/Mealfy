import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type FamilyResponsibleAssignmentEndReason, type UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { sendFamilyResponsibleInvitationEmail } from '../../shared/services/mailer';
import { resolveEntityAuthority } from '../entities/entityAuthority.service';
import { revokeFamilyPixStepUpGrants } from './evpKey.service';

const TTL = 48 * 60 * 60 * 1000;
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 4;
const assignmentSelect = { id: true, familyId: true, responsibleUserId: true, assignedAt: true, endedAt: true, endReason: true, family: { select: { id: true, displayName: true, entityId: true, approvalStatus: true } } } as const;
const inviteSelect = { id: true, expiresAt: true, createdAt: true } as const;
type Op = 'direct_pix.invite_family_responsible' | 'direct_pix.accept_family_responsible' | 'direct_pix.end_family_responsible';
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function requestHash(body: Record<string, string>): string { return hash(JSON.stringify(body)); }
function invalidInvitation(): never { throw new AppError('Convite inválido ou expirado.', 400, 'invalid_family_responsible_invitation'); }
function retryable(e: unknown): boolean { return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2002' || e.code === 'P2034'); }
function concurrent(): never { throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation'); }
function idempotencyConflict(): never { throw new AppError('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict'); }
async function authority(tx: Prisma.TransactionClient, actorId: string, role: UserRole, familyId: string) {
 const family=await tx.family.findUnique({where:{id:familyId},select:{id:true,entityId:true,approvalStatus:true}});
 if(!family||family.approvalStatus!=='approved') throw new AppError('Família não encontrada.',404,'family_not_found');
 if(role==='admin') return family;
 if(role!=='entity') throw new AppError('Acesso negado.',403,'forbidden');
 const membership=await resolveEntityAuthority(actorId,'families.write',tx);
 if(!family.entityId||family.entityId!==membership.entityId) throw new AppError('Família não encontrada.',404,'family_not_found');
 return family;
}
async function replay<T>(actorId:string,op:Op,key:string,bodyHash:string,load:(id:string)=>Promise<T|null>):Promise<T|null>{
 const record=await prisma.idempotencyRecord.findUnique({where:{actorUserId_operation_idempotencyKey:{actorUserId:actorId,operation:op,idempotencyKey:key}}});
 if(!record)return null;if(record.requestHash!==bodyHash)idempotencyConflict();
 if(record.status!=='completed'||!record.resourceId)throw new AppError('A operação idempotente ainda está em processamento.',409,'idempotency_in_progress');
 const resource=await load(record.resourceId);if(!resource)throw new Error('completed idempotency resource missing');return resource;
}
async function run<T extends {id:string}>(actorId:string,op:Op,key:string,bodyHash:string,work:(tx:Prisma.TransactionClient,recordId:string)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++)try{return await prisma.$transaction(async tx=>{
   const record=await tx.idempotencyRecord.create({data:{actorUserId:actorId,operation:op,idempotencyKey:key,requestHash:bodyHash,status:'processing',expiresAt:new Date(Date.now()+IDEMPOTENCY_TTL)}});
   const result=await work(tx,record.id);
   await tx.idempotencyRecord.update({where:{id:record.id},data:{resourceType:op,resourceId:result.id,status:'completed',completedAt:new Date()}});return result;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}catch(e){if(!retryable(e)||attempt===MAX_ATTEMPTS-1)throw e;}
 return concurrent();
}
export async function inviteFamilyResponsible(actorId:string,role:UserRole,familyId:string,input:{email:string},idempotencyKey:string){
 const op:Op='direct_pix.invite_family_responsible', bodyHash=requestHash({familyId,email:input.email}), previous=await replay(actorId,op,idempotencyKey,bodyHash,id=>prisma.familyResponsibleInvitation.findUnique({where:{id},select:inviteSelect}));
 if(previous)return {invitation:{...previous,status:'pending' as const},replayed:true};
 const rawToken=randomBytes(32).toString('base64url');
 const invitation=await run(actorId,op,idempotencyKey,bodyHash,async(tx,recordId)=>{await authority(tx,actorId,role,familyId);await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`family-responsible-family:${familyId}`}))`;
   const active=await tx.familyResponsibleAssignment.findFirst({where:{familyId,endedAt:null},select:{id:true}});if(active)throw new AppError('A família já possui responsável ativo.',409,'family_responsible_already_assigned');
   await tx.familyResponsibleInvitation.updateMany({where:{familyId,email:input.email,acceptedAt:null,revokedAt:null},data:{revokedAt:new Date()}});
   const created=await tx.familyResponsibleInvitation.create({data:{familyId,email:input.email,tokenHash:hash(rawToken),invitedByUserId:actorId,expiresAt:new Date(Date.now()+TTL)},select:inviteSelect});
   await tx.auditLog.create({data:{actorUserId:actorId,actorRole:role,action:'direct_pix.family_responsible.invited',entityType:'family_responsible_invitation',entityId:created.id,channel:'web_pwa',idempotencyKey,result:'invited',metadata:{familyId}}});
   await tx.outboxEvent.create({data:{eventType:'direct_pix.family_responsible.invited',aggregateType:'family_responsible_invitation',aggregateId:created.id,dedupeKey:recordId}});return created;});
 try{await sendFamilyResponsibleInvitationEmail(input.email,rawToken);}catch(e){await prisma.familyResponsibleInvitation.updateMany({where:{id:invitation.id,acceptedAt:null,revokedAt:null},data:{revokedAt:new Date()}});throw e;}
 return {invitation:{...invitation,status:'pending' as const},replayed:false};
}
export async function acceptFamilyResponsibleInvitation(actorId:string,rawToken:string,idempotencyKey:string){
 const op:Op='direct_pix.accept_family_responsible',digest=hash(rawToken),bodyHash=requestHash({tokenHash:digest}),previous=await replay(actorId,op,idempotencyKey,bodyHash,id=>prisma.familyResponsibleAssignment.findUnique({where:{id},select:assignmentSelect}));if(previous)return {assignment:previous,replayed:true};
 const assignment=await run(actorId,op,idempotencyKey,bodyHash,async(tx,recordId)=>{const user=await tx.user.findUnique({where:{id:actorId},select:{email:true,emailVerifiedAt:true,status:true,role:true}});if(!user||user.role!=='beneficiary')throw new AppError('Acesso negado.',403,'forbidden');if(user.status!=='active'||!user.emailVerifiedAt)throw new AppError('Conta ativa e e-mail verificado são obrigatórios.',403,'verified_account_required');
   const invitation=await tx.familyResponsibleInvitation.findUnique({where:{tokenHash:digest}});if(!invitation||invitation.email!==user.email.toLowerCase()||invitation.acceptedAt||invitation.revokedAt||invitation.expiresAt<=new Date())invalidInvitation();
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`family-responsible-family:${invitation.familyId}`}))`;await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`family-responsible-user:${actorId}`}))`;
   const activeFamily=await tx.familyResponsibleAssignment.findFirst({where:{familyId:invitation.familyId,endedAt:null},select:{id:true}});if(activeFamily)throw new AppError('A família já possui responsável ativo.',409,'family_responsible_already_assigned');
   const activeUser=await tx.familyResponsibleAssignment.findFirst({where:{responsibleUserId:actorId,endedAt:null},select:{id:true}});if(activeUser)throw new AppError('A conta já representa outra família.',409,'responsible_already_assigned');
   const now=new Date(),consumed=await tx.familyResponsibleInvitation.updateMany({where:{id:invitation.id,acceptedAt:null,revokedAt:null,expiresAt:{gt:now}},data:{acceptedAt:now,acceptedByUserId:actorId}});if(consumed.count!==1)invalidInvitation();
   const created=await tx.familyResponsibleAssignment.create({data:{familyId:invitation.familyId,responsibleUserId:actorId,invitationId:invitation.id,invitedByUserId:invitation.invitedByUserId,assignedAt:now},select:assignmentSelect});
   await tx.auditLog.create({data:{actorUserId:actorId,actorRole:'beneficiary',action:'direct_pix.family_responsible.invitation_accepted',entityType:'family_responsible_assignment',entityId:created.id,channel:'web_pwa',idempotencyKey,result:'active',metadata:{familyId:created.familyId,invitationId:invitation.id}}});await tx.outboxEvent.create({data:{eventType:'direct_pix.family_responsible.assigned',aggregateType:'family_responsible_assignment',aggregateId:created.id,dedupeKey:recordId}});return created;});return {assignment,replayed:false};
}
export async function endFamilyResponsibleAssignment(actorId:string,role:UserRole,familyId:string,assignmentId:string,endReason:FamilyResponsibleAssignmentEndReason,idempotencyKey:string){
 const op:Op='direct_pix.end_family_responsible',bodyHash=requestHash({familyId,assignmentId,endReason}),previous=await replay(actorId,op,idempotencyKey,bodyHash,id=>prisma.familyResponsibleAssignment.findUnique({where:{id},select:assignmentSelect}));if(previous)return {assignment:previous,replayed:true};
 const assignment=await run(actorId,op,idempotencyKey,bodyHash,async(tx,recordId)=>{await authority(tx,actorId,role,familyId);await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`family-responsible-family:${familyId}`}))`;const current=await tx.familyResponsibleAssignment.findFirst({where:{id:assignmentId,familyId,endedAt:null},select:{id:true,responsibleUserId:true}});if(!current)throw new AppError('Vínculo ativo não encontrado.',404,'family_responsible_assignment_not_found');
 const now=new Date();await tx.familyResponsibleInvitation.updateMany({where:{familyId,acceptedAt:null,revokedAt:null},data:{revokedAt:now}});const keyRevocation=await tx.directPixEvpKeyVersion.updateMany({where:{familyId,assignmentId:current.id,status:{in:['AWAITING_RESPONSIBLE_CONFIRMATION','PENDING_REVIEW','SECOND_APPROVAL_REQUIRED','ACTIVE','SUSPENDED']}},data:{status:'REVOKED'}});await revokeFamilyPixStepUpGrants(tx,familyId,now);const updated=await tx.familyResponsibleAssignment.update({where:{id:current.id},data:{endedAt:now,endReason},select:assignmentSelect});await tx.auditLog.create({data:{actorUserId:actorId,actorRole:role,action:'direct_pix.family_responsible.ended',entityType:'family_responsible_assignment',entityId:updated.id,channel:'web_pwa',idempotencyKey,result:'ended',metadata:{familyId,endReason,revokedUsableKeyVersionCount:keyRevocation.count}}});await tx.outboxEvent.create({data:{eventType:'direct_pix.evp.revoked_by_assignment_end',aggregateType:'family_responsible_assignment',aggregateId:updated.id,dedupeKey:'direct-pix-assignment-end-revocation:'+recordId}});await tx.outboxEvent.create({data:{eventType:'direct_pix.family_responsible.ended',aggregateType:'family_responsible_assignment',aggregateId:updated.id,dedupeKey:recordId}});return updated;});return {assignment,replayed:false};
}
export async function getOwnFamilyResponsibleState(actorId:string){const assignments=await prisma.familyResponsibleAssignment.findMany({where:{responsibleUserId:actorId,endedAt:null,responsibleUser:{status:'active',role:'beneficiary'}},select:assignmentSelect,take:2});if(assignments.length>1)throw new AppError('Autoridade de responsável ambígua.',403,'family_responsible_authority_ambiguous');return {assignment:assignments[0]??null};}
