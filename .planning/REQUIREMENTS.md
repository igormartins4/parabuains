# Requirements: Parabuains

**Defined:** 2026-04-29
**Core Value:** Amigos nunca mais esquecem seu aniversario - e voce ve o de todos de forma facil, num so lugar.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: Usuario pode criar conta com e-mail e senha
- [ ] **AUTH-02**: Usuario recebe e-mail de verificacao apos cadastro
- [ ] **AUTH-03**: Usuario pode fazer login com Google OAuth
- [ ] **AUTH-04**: Usuario pode fazer login com Twitter/X OAuth
- [ ] **AUTH-05**: Usuario pode redefinir senha via link por e-mail
- [ ] **AUTH-06**: Sessao persiste apos fechar o navegador (refresh token)
- [ ] **AUTH-07**: Usuario pode ativar autenticacao de dois fatores (2FA TOTP)
- [ ] **AUTH-08**: Conta e bloqueada temporariamente apos multiplas tentativas de login falhas
- [ ] **AUTH-09**: Tokens JWT com refresh rotation e expiracao configuravel
- [ ] **AUTH-10**: Login unificado - OAuth e e-mail/senha nao criam contas duplicadas para o mesmo e-mail

### Profile

- [ ] **PROF-01**: Usuario pode definir nome de exibicao e username unico (usado na URL /usuario)
- [ ] **PROF-02**: Usuario pode fazer upload de foto de perfil (avatar)
- [ ] **PROF-03**: Usuario pode definir data de aniversario (dia e mes obrigatorios; ano opcional)
- [ ] **PROF-04**: Usuario pode escrever uma bio/descricao curta (max 300 chars)
- [ ] **PROF-05**: Usuario pode configurar privacidade do perfil (publico / so amigos / privado)
- [ ] **PROF-06**: Pagina do perfil exibe contagem regressiva para o proximo aniversario
- [ ] **PROF-07**: Usuario pode compartilhar link do perfil com um clique (copiar URL)
- [ ] **PROF-08**: Perfil exibe lista de amigos em comum com o visitante
- [ ] **PROF-09**: Ano de nascimento e oculto por padrao para nao-amigos (privacidade LGPD)

### Social

- [ ] **SOCL-01**: Usuario pode enviar pedido de amizade para outro usuario
- [ ] **SOCL-02**: Usuario pode aceitar ou recusar pedido de amizade recebido
- [ ] **SOCL-03**: Usuario pode remover um amigo existente
- [ ] **SOCL-04**: Usuario pode visualizar e gerenciar sua lista de amigos
- [ ] **SOCL-05**: Usuario pode buscar outros usuarios por nome ou username
- [ ] **SOCL-06**: Usuario ve feed de aniversarios proximos (proximo 30 dias) de seus amigos
- [ ] **SOCL-07**: Aniversariantes do dia sao destacados no topo do feed
- [ ] **SOCL-08**: Sistema sugere possiveis amizades (amigos de amigos)

### Messages

- [ ] **MSG-01**: Usuario autenticado pode escrever mensagem publica no mural de um amigo
- [ ] **MSG-02**: Usuario autenticado pode enviar mensagem privada (visivel apenas ao aniversariante)
- [ ] **MSG-03**: Usuario autenticado pode enviar mensagem anonima (remetente oculto para o destinatario, mas registrado no servidor para moderacao)
- [ ] **MSG-04**: Remetente escolhe o tipo da mensagem ao enviar (publica / privada / anonima)
- [ ] **MSG-05**: Aniversariante pode apagar mensagens do seu proprio mural
- [ ] **MSG-06**: Usuario pode reportar mensagem inadequada
- [ ] **MSG-07**: Mensagens passam por sanitizacao de HTML/XSS antes de serem salvas

### Notifications

- [ ] **NOTF-01**: Usuario recebe lembrete por e-mail antes do aniversario de amigo (antecedencia configuravel)
- [ ] **NOTF-02**: Usuario recebe notificacao push web antes do aniversario de amigo
- [ ] **NOTF-03**: Usuario recebe lembrete no proprio dia do aniversario do amigo (e-mail + push)
- [ ] **NOTF-04**: Usuario pode configurar antecedencia dos lembretes (1, 3, 7 dias)
- [ ] **NOTF-05**: Usuario recebe notificacao quando alguem escreve no seu mural
- [ ] **NOTF-06**: Usuario recebe notificacao quando pedido de amizade e aceito
- [ ] **NOTF-07**: Usuario pode configurar preferencias de notificacao por canal e tipo de evento
- [ ] **NOTF-08**: Notificacoes de aniversario sao agendadas considerando o timezone do usuario

## v2 Requirements

### Social Extras

- **SOCL-V2-01**: Reacoes/curtidas em mensagens do mural
- **SOCL-V2-02**: Ranking de aniversarios do dia na plataforma

### Notifications Extras

- **NOTF-V2-01**: Integracao com WhatsApp (via API oficial Meta)
- **NOTF-V2-02**: Integracao com Google Calendar / Apple Calendar

### Profile Extras

- **PROF-V2-01**: Temas personalizados para pagina de aniversario
- **PROF-V2-02**: Lista de desejos (wishlist) no perfil para sugestoes de presente

### Monetization

- **MON-V2-01**: Plano premium com temas exclusivos e perfil sem anuncios
- **MON-V2-02**: Sugestoes de presentes com links afiliados no dia do aniversario
- **MON-V2-03**: Plano para grupos/empresas (aniversarios de equipes)

## Out of Scope

| Feature | Reason |
|---------|--------|
| App mobile nativo (iOS/Android) | Web mobile-first suficiente para v1; custo alto de manutencao |
| WhatsApp notifications | API paga, processo de aprovacao Meta complexo; v2 |
| Integracoes de calendario | Desejavel mas nao essencial para v1 |
| Reacoes/curtidas em mensagens | Feature de engajamento; v2 apos validar produto base |
| Temas personalizados | Diferenciador para monetizacao; v2 |
| Conteudo em video ou GIFs animados no mural | Complexidade de armazenamento/moderacao; v2 |
| Chat em tempo real | Alta complexidade (WebSockets), nao e o core da proposta |
| IA para gerar mensagens automaticas | Anti-feature: reduz autenticidade das mensagens |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| AUTH-09 | Phase 2 | Pending |
| AUTH-10 | Phase 2 | Pending |
| PROF-01 | Phase 3 | Pending |
| PROF-02 | Phase 3 | Pending |
| PROF-03 | Phase 3 | Pending |
| PROF-04 | Phase 3 | Pending |
| PROF-05 | Phase 3 | Pending |
| PROF-06 | Phase 3 | Pending |
| PROF-07 | Phase 3 | Pending |
| PROF-08 | Phase 3 | Pending |
| PROF-09 | Phase 3 | Pending |
| SOCL-01 | Phase 4 | Pending |
| SOCL-02 | Phase 4 | Pending |
| SOCL-03 | Phase 4 | Pending |
| SOCL-04 | Phase 4 | Pending |
| SOCL-05 | Phase 4 | Pending |
| SOCL-06 | Phase 4 | Pending |
| SOCL-07 | Phase 4 | Pending |
| SOCL-08 | Phase 4 | Pending |
| MSG-01 | Phase 5 | Pending |
| MSG-02 | Phase 5 | Pending |
| MSG-03 | Phase 5 | Pending |
| MSG-04 | Phase 5 | Pending |
| MSG-05 | Phase 5 | Pending |
| MSG-06 | Phase 5 | Pending |
| MSG-07 | Phase 5 | Pending |
| NOTF-01 | Phase 6 | Pending |
| NOTF-02 | Phase 6 | Pending |
| NOTF-03 | Phase 6 | Pending |
| NOTF-04 | Phase 6 | Pending |
| NOTF-05 | Phase 6 | Pending |
| NOTF-06 | Phase 6 | Pending |
| NOTF-07 | Phase 6 | Pending |
| NOTF-08 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 checkmark

---
*Requirements defined: 2026-04-29*
*Last updated: 2026-04-29 after initial definition*
