/* Gera docs/Manual-Mealfy.pdf a partir do conteúdo do manual.
   Uso: node scripts/gen-manual-pdf.cjs */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const NAVY = '#00365f', NAVY2 = '#0a4f86', GOLD = '#c7a754';
const INK = '#15181d', GRAY = '#5b636e', LINE = '#e4e7ec', BG2 = '#eef1f5';

const OUT = path.join(__dirname, '..', 'docs', 'Manual-Mealfy.pdf');
const M = { top: 70, bottom: 64, left: 58, right: 58 };
const doc = new PDFDocument({ size: 'A4', margins: M, bufferPages: true, autoFirstPage: false });
doc.pipe(fs.createWriteStream(OUT));

const PW = doc.page ? doc.page.width : 595.28; // A4 width pts
const pageW = 595.28, pageH = 841.89;
const contentW = pageW - M.left - M.right;
const bottomY = pageH - M.bottom;

function ensure(h) {
  if (doc.y + h > bottomY) doc.addPage();
}

function h1(num, title) {
  if (doc.y > M.top + 4) doc.moveDown(0.8);
  ensure(48);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(15.5).text(`${num}.  ${title}`, M.left, doc.y);
  const y = doc.y + 4;
  doc.moveTo(M.left, y).lineTo(M.left + contentW, y).lineWidth(1.4).strokeColor(GOLD).stroke();
  doc.moveDown(0.6);
}

function h2(title) {
  doc.moveDown(0.4);
  ensure(26);
  doc.fillColor(NAVY2).font('Helvetica-Bold').fontSize(11.5).text(title, M.left, doc.y);
  doc.moveDown(0.25);
}

function p(text) {
  ensure(16);
  doc.fillColor(INK).font('Helvetica').fontSize(10).text(text, M.left, doc.y, { width: contentW, align: 'left', lineGap: 2.5 });
  doc.moveDown(0.4);
}

function quote(text) {
  ensure(24);
  const y0 = doc.y;
  doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9.5)
     .text(text, M.left + 14, y0, { width: contentW - 14, lineGap: 2 });
  doc.moveTo(M.left + 3, y0 - 1).lineTo(M.left + 3, doc.y - 2).lineWidth(2.2).strokeColor(GOLD).stroke();
  doc.moveDown(0.5);
}

function bullet(label, text) {
  ensure(16);
  const x = M.left + 12, w = contentW - 12;
  const y = doc.y;
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10).text('•', M.left + 2, y);
  doc.fillColor(INK).fontSize(10);
  if (label) {
    doc.font('Helvetica-Bold').text(label, x, y, { width: w, continued: true, lineGap: 2.5 });
    doc.font('Helvetica').text(text ? ' — ' + text : '', { width: w, lineGap: 2.5 });
  } else {
    doc.font('Helvetica').text(text, x, y, { width: w, lineGap: 2.5 });
  }
  doc.moveDown(0.25);
}

function step(n, label, text) {
  ensure(16);
  const x = M.left + 18, w = contentW - 18;
  const y = doc.y;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(n + '.', M.left + 2, y);
  doc.fillColor(INK).fontSize(10);
  if (label) {
    doc.font('Helvetica-Bold').text(label, x, y, { width: w, continued: true, lineGap: 2.5 });
    doc.font('Helvetica').text(text ? ' — ' + text : '', { width: w, lineGap: 2.5 });
  } else {
    doc.font('Helvetica').text(text, x, y, { width: w, lineGap: 2.5 });
  }
  doc.moveDown(0.25);
}

function table(colW, header, rows) {
  const padX = 8, padY = 6, fs = 9;
  const measure = (txt, w, font) => { doc.font(font).fontSize(fs); return doc.heightOfString(txt, { width: w - padX * 2, lineGap: 1.5 }); };
  const rowHeight = (cells, font) => Math.max(...cells.map((c, i) => measure(String(c), colW[i], font))) + padY * 2;

  const drawRow = (cells, font, bg, color) => {
    const h = rowHeight(cells, font);
    ensure(h);
    let x = M.left;
    const y = doc.y;
    if (bg) { doc.rect(M.left, y, contentW, h).fill(bg); }
    cells.forEach((c, i) => {
      doc.fillColor(color).font(font).fontSize(fs).text(String(c), x + padX, y + padY, { width: colW[i] - padX * 2, lineGap: 1.5 });
      x += colW[i];
    });
    // borders
    doc.moveTo(M.left, y + h).lineTo(M.left + contentW, y + h).lineWidth(0.6).strokeColor(LINE).stroke();
    doc.y = y + h;
  };

  drawRow(header, 'Helvetica-Bold', NAVY, '#ffffff');
  rows.forEach((r, idx) => drawRow(r, 'Helvetica', idx % 2 ? BG2 : '#ffffff', INK));
  doc.moveDown(0.5);
}

// ──────────────────────────────────────────────── COVER
doc.addPage();
doc.rect(0, 0, pageW, 300).fill(NAVY);
doc.fillColor(GOLD).font('Helvetica-BoldOblique').fontSize(30).text('Mealfy', M.left, 96);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(30).text('Manual do Usuário', M.left, 150, { width: contentW });
doc.fillColor('#cdd8e3').font('Helvetica').fontSize(12)
   .text('Guia completo de uso do aplicativo — o que cada tela faz e como usá-la.', M.left, 210, { width: contentW - 60, lineGap: 3 });
doc.y = 340;
doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(
  'O Mealfy conecta pessoas dispostas a ajudar a famílias em situação de insegurança alimentar. ' +
  'Este manual apresenta, de forma simples, todos os recursos do aplicativo, organizados por perfil de usuário.',
  M.left, doc.y, { width: contentW, lineGap: 3 });
doc.moveDown(1.5);
doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text('Conteúdo', M.left, doc.y);
doc.moveDown(0.4);
const toc = ['Visão geral', 'Perfis de usuário', 'Primeiros passos: criar conta e entrar',
  'Para Apoiadores (quem doa)', 'Para Entidades', 'Para Beneficiários',
  'Perfil e configurações', 'Suporte e ajuda', 'Painel administrativo (web)', 'Glossário'];
toc.forEach((t, i) => {
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10).text((i + 1) + '.', M.left, doc.y, { continued: true });
  doc.fillColor(INK).font('Helvetica').text('  ' + t);
  doc.moveDown(0.15);
});

// ──────────────────────────────────────────────── CONTENT
doc.addPage();

h1(1, 'Visão geral');
p('O Mealfy transforma a ajuda de apoiadores em vales-alimentação entregues a famílias cadastradas e validadas por entidades parceiras. O caminho do impacto é simples:');
quote('Apoiador contribui  ›  o valor vira um vale-alimentação  ›  a família beneficiária recebe e resgata em mercados/parceiros  ›  entidades validam e acompanham as famílias.');
p('A navegação principal fica na barra inferior, que muda conforme o seu perfil.');

h1(2, 'Perfis de usuário');
table([95, 170, contentW - 95 - 170],
  ['Perfil', 'Para quem é', 'O que faz'],
  [
    ['Apoiador', 'Quem quer ajudar', 'Doa, explora regiões, acompanha o impacto no mapa e indica famílias.'],
    ['Entidade', 'ONGs, institutos, coletivos', 'Cadastra e valida famílias e acompanha indicações.'],
    ['Beneficiário', 'Famílias atendidas', 'Acompanha o cadastro e resgata os vales-alimentação.'],
    ['Administrador', 'Equipe Mealfy', 'Gerencia a plataforma pelo painel web.'],
  ]);
p('Cada perfil vê telas e menus específicos após entrar.');

h1(3, 'Primeiros passos: criar conta e entrar');
h2('Entrar');
p('Na tela de login você pode acessar de várias formas:');
bullet('E-mail e senha', 'digite seus dados e toque em Entrar.');
bullet('Continuar com Google / Continuar com Meta', 'entrada rápida com sua conta.');
bullet('Entrar com Gov.br', 'entrada com verificação de identidade: nome completo e data de nascimento são confirmados e preenchidos automaticamente, agilizando o cadastro e liberando o selo "Verificado via Gov.br".');
bullet('Esqueci minha senha', 'informe seu e-mail para receber as instruções de redefinição.');
h2('Criar conta');
p('Toque em Criar conta. O cadastro é guiado, uma pergunta por vez:');
step(1, null, 'Escolha seu perfil: Apoiador, Entidade ou Beneficiário.');
step(2, null, 'Responda às perguntas (nome, contato e dados específicos do perfil).');
step(3, null, 'Revise o resumo e conclua.');
quote('A barra de progresso no topo mostra quanto falta para terminar. Você pode voltar a qualquer pergunta usando a seta de voltar.');

h1(4, 'Para Apoiadores (quem doa)');
p('Menu inferior: Início · Mapa · Alimente · Perfil.');
h2('4.1 Início');
p('A tela inicial reúne tudo o que importa para agir rápido:');
bullet('Comunidade ativa', 'carrossel com apoiadores em destaque. Toque em um deles para ver o perfil público de impacto.');
bullet('Chamada principal', 'botões "Alimente uma criança" (inicia uma doação) e "Explorar mapa regional".');
bullet('Impacto na sua região', 'números atualizados (regiões, famílias que precisam agora, famílias já apoiadas).');
bullet('Apoie a plataforma', 'contribuição opcional para manter o serviço no ar.');
bullet('Compartilhar', 'divulgue a causa por WhatsApp, Instagram, e-mail ou link.');
h2('4.2 Mapa');
p('Mostra as famílias e regiões no mapa.');
bullet('Filtros', 'filtre por região, status, urgência ou apenas famílias salvas.');
bullet('Legenda', 'explica as cores e marcadores.');
bullet('Apoio Coletivo', 'ative para selecionar várias famílias de uma vez e apoiar em lote.');
bullet('Salvar família', 'marque famílias para acompanhar depois.');
bullet('Recentrar', 'botão flutuante que volta o mapa para a sua região.');
h2('4.3 Explorar');
p('Lista as comunidades/regiões ordenadas por proximidade e urgência. Cada cartão mostra a distância, o número de famílias atendidas e um selo de prioridade. Toque em "Ajudar esta região" para apoiar a comunidade.');
h2('4.4 Alimentar (fazer uma doação)');
p('Fluxo guiado em 3 passos:');
step(1, 'Famílias', 'escolha quantas famílias quer ajudar.');
step(2, 'Crianças', 'ajuste o valor conforme o tamanho das famílias (ou escolha o perfil recomendado, que distribui um valor médio).');
step(3, 'Resumo', 'confira o valor total, marque se quer tornar o apoio mensal (recorrente) e toque em "Confirmar e Alimentar".');
p('Ao confirmar, você vê a tela de conclusão com o código do vale gerado, a opção de enviar uma mensagem de força para a família e botões para acompanhar no mapa, compartilhar ou ir ao perfil.');
h2('4.5 Apoio Ampliado (doação em escala)');
p('Para apoiar em maior volume, escolha um valor (por exemplo, R$ 100 / 250 / 500) e a região alvo. O valor é distribuído automaticamente entre as famílias de maior necessidade.');
h2('4.6 Apoio Recorrente');
p('Em Perfil › Gerenciar Apoios Recorrentes, você acompanha suas assinaturas mensais ou semanais. Para cada uma é possível Editar, Pausar, Reativar ou Cancelar, e ver a próxima data de renovação.');
h2('4.7 Indicar uma família');
p('Conhece uma família que precisa de ajuda? Use Indicar Família. Para garantir a qualidade das indicações, esse recurso é liberado após você concluir alguns apoios — a tela mostra o seu progresso até a liberação.');
h2('4.8 Detalhe da comunidade e da família');
bullet('Comunidade', 'abre a região com sua descrição, nível de urgência e a lista de famílias para apoiar (com opção de modo coletivo).');
bullet('Família (Ficha de Apoio)', 'mostra a entidade que validou o cadastro, o contexto da família, as crianças, a necessidade principal e o botão "Alimentar essa família".');

h1(5, 'Para Entidades');
p('Menu inferior: Painel · Cadastrar · Perfil.');
h2('5.1 Painel da Entidade');
p('Centraliza a gestão das famílias da sua região:');
bullet('Indicadores', 'total de famílias e quantas já foram alimentadas.');
bullet('Fila de indicações', 'indicações recebidas, aguardando validação.');
bullet('Famílias cadastradas', 'lista com o status de apoio (Alimentada / Aguardando) e os selos de validação (CadÚnico, Verificado via Gov.br ou Identidade pendente).');
bullet('Cadastrar Nova Família', 'abre o formulário de cadastro.');
h2('5.2 Cadastrar Família');
p('Formulário para registrar uma família beneficiária:');
bullet('NIS do responsável', 'informe para validação e toque em Verificar.');
bullet('Dados', 'preencha nome do representante, comunidade, endereço, bairro/UF e os dados das crianças.');
p('Após o cadastro, a família passa a aparecer no painel e pode receber apoios.');

h1(6, 'Para Beneficiários');
p('Menu inferior: Início · Perfil.');
h2('6.1 Meu Painel');
p('Acompanhe a situação do seu cadastro e seus benefícios:');
bullet('Status do cadastro', 'pode estar Em análise, Aprovado ou Não aprovado, cada um com orientações claras do que fazer em seguida.');
bullet('Selo de verificação', 'mostra se sua identidade está Verificada via Gov.br ou pendente.');
bullet('Vale-Refeição liberado', 'quando aprovado, exibe o código de resgate (com botão para copiar) e o QR Code para apresentar no caixa ou no app do parceiro.');
bullet('Histórico', 'recebimentos anteriores.');
h2('6.2 Escolher o vale-alimentação');
p('Você pode escolher em qual parceiro deseja resgatar o benefício (por exemplo, iFood, Carrefour ou 99Food):');
step(1, null, 'Toque em "Alterar vale-alimentação".');
step(2, null, 'Selecione o parceiro (o cartão escolhido fica destacado com um check).');
step(3, null, 'Toque em "Confirmar escolha".');
p('O vale exibido passa a mostrar o parceiro escolhido. Você pode trocar quando quiser.');

h1(7, 'Perfil e configurações');
p('Disponível para todos os perfis na aba Perfil.');
bullet('Cabeçalho', 'avatar, nome, e-mail e sua patente/nível de evolução.');
bullet('Resumo de impacto', 'total apoiado, refeições e posição no ranking (toque para ver detalhes).');
bullet('Evolução', 'barra de progresso até o próximo nível e atalho para as insígnias.');
bullet('Ficha pública de impacto', 'como você aparece para a comunidade: patente, foco regional, impacto estimado, rede social e sua Missão pessoal. Inclui um QR Code para compartilhar sua ficha.');
bullet('Medalhas de Impacto', 'conquistas desbloqueadas e as próximas a alcançar.');
bullet('Configurações da conta', 'privacidade (mostrar/ocultar no ranking, exibir Instagram, modo anônimo), região preferencial de apoio, e atalhos para apoios recorrentes, ranking e medalhas, indicar família, suporte e sair da conta.');

h1(8, 'Suporte e ajuda');
bullet('Suporte e Ajuda', 'central com dúvidas frequentes (toque para expandir) e atendimento direto por WhatsApp ou e-mail.');
bullet('Guia do Aplicativo', 'passo a passo dos principais recursos (explorar o mapa, apoio ampliado, sistema de patentes, apoio recorrente).');

h1(9, 'Painel administrativo (web)');
p('O Painel Administrativo é acessado pela versão web por usuários com perfil de administrador. Ele reúne a gestão completa da plataforma, com um menu lateral e as seções:');
bullet('Visão geral', 'métricas da plataforma: usuários por perfil, entidades e famílias pendentes, contas suspensas, total apoiado e quantidade de destaques ativos.');
bullet('Stories (Top 20)', 'edição do carrossel de apoiadores em destaque da tela inicial: reordenar posições; editar nome, Instagram, região, valor e imagem; controlar a visibilidade (visível/oculto) e o modo anônimo/identificado; adicionar ou remover destaques. Clique em "Salvar alterações" para publicar.');
bullet('Entidades', 'moderação das entidades: Aprovar, Rejeitar ou Suspender.');
bullet('Famílias', 'moderação das famílias beneficiárias: Aprovar, Rejeitar ou Suspender.');
bullet('Usuários', 'gestão de contas: suspender/ativar e alterar o papel (Apoiador, Entidade, Beneficiário, Administrador).');
p('No rodapé da lateral há atalhos para ir ao app e sair.');

h1(10, 'Glossário');
table([165, contentW - 165],
  ['Termo', 'Significado'],
  [
    ['Apoiador', 'Pessoa que contribui para alimentar famílias.'],
    ['Entidade', 'Organização que cadastra e valida famílias.'],
    ['Beneficiário', 'Família que recebe os vales-alimentação.'],
    ['Vale-alimentação / Vale-refeição', 'Crédito para resgatar alimentos em parceiros.'],
    ['Apoio Coletivo / Ampliado', 'Apoiar várias famílias ou uma região de uma só vez.'],
    ['Apoio Recorrente', 'Contribuição automática (semanal ou mensal).'],
    ['Patente / Nível', 'Sua evolução como apoiador, conforme você apoia mais.'],
    ['Insígnias / Medalhas', 'Conquistas dentro da plataforma.'],
    ['Verificado via Gov.br', 'Identidade confirmada pela verificação oficial.'],
    ['CadÚnico', 'Indica famílias com cadastro social ativo.'],
    ['Ficha pública', 'Perfil de impacto visível para a comunidade.'],
  ]);
p('Em caso de dúvidas, use a opção Suporte e Ajuda dentro do aplicativo.');

// ──────────────────────────────────────────────── FOOTERS
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  if (i === 0) continue; // sem rodapé na capa
  const fy = pageH - 42;
  doc.moveTo(M.left, fy).lineTo(pageW - M.right, fy).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.fillColor(GRAY).font('Helvetica').fontSize(8);
  doc.text('Mealfy — Manual do Usuário', M.left, fy + 6, { width: contentW / 2, align: 'left' });
  doc.text('Página ' + (i + 1) + ' de ' + range.count, M.left + contentW / 2, fy + 6, { width: contentW / 2, align: 'right' });
}

doc.end();
console.log('PDF gerado em', OUT);
