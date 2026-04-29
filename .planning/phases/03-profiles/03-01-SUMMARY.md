# Plan 03-01 Summary — Profile API (Fastify)

**Status:** Completo  
**Data:** 2026-04-29  
**Testes:** 14/14 passando (12 novos + 2 existentes)

## O que foi feito

### Arquivos criados
- `apps/api/src/errors.ts` — AppError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, BadRequestError
- `apps/api/src/modules/users/user.schemas.ts` — Zod v4 schemas: usernameSchema, usernameChangeSchema, updateProfileSchema, getProfileParamsSchema, mutualFriendsParamsSchema, publicProfileSchema, mutualFriendsResponseSchema
- `apps/api/src/modules/users/user.repository.ts` — UserRepository com: findByUsername, findById, isUsernameInHistory, updateProfile, changeUsername (com transaction), getMutualFriends, areFriends
- `apps/api/src/modules/users/user.service.ts` — UserService com: getProfile (privacy enforcement), buildMinimalProfile, buildFullProfile (birth year hiding), updateProfile, changeUsername, getMutualFriends
- `apps/api/src/modules/users/user.routes.ts` — 4 endpoints: GET /users/:username, PUT /users/me/profile, POST /users/me/username, GET /users/:username/mutual-friends
- `apps/api/src/modules/users/user.plugin.ts` — fastify-plugin wrapper
- `apps/api/src/modules/users/__tests__/user.service.test.ts` — 12 testes cobrindo todos os cenários de privacy

### Arquivos modificados
- `apps/api/src/app.ts` — registra usersPlugin com prefix /v1

### Notas de adaptação
- O plano especificava `fastify.authenticate` decorator que não existe — adaptado para verificar `request.userId` (populado pelo authPlugin global existente)
- `username_history` schema e migration já existiam do Phase 1 (schema/app.ts + 0000_round_sugar_man.sql)
- UserRepository usa `getDb()` diretamente (padrão lazy singleton do projeto)

## Endpoints implementados
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | /v1/users/:username | opcional | Perfil público com privacy enforcement |
| PUT | /v1/users/me/profile | obrigatória | Atualizar próprio perfil |
| POST | /v1/users/me/username | obrigatória | Trocar username (com histórico) |
| GET | /v1/users/:username/mutual-friends | obrigatória | Amigos em comum |

## Segurança implementada
- Perfis privados retornam 404 (não 403) para não confirmar existência
- `viewerId` derivado do JWT, nunca do body/query
- Ano de nascimento ocultado por padrão (MM-DD) para não-amigos quando `birthYearHidden=true`
- Username único enforçado por transaction atômica com registro em username_history
