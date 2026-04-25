const fs = require('fs');
const path = require('path');

const promptsPath = path.join(__dirname, '..', 'prompts', 'prompts.js');
let s = fs.readFileSync(promptsPath, 'utf8');

const folderNeedle =
  "  { id: 'f-scholar-explore', name: 'SCHOLAR EXPLORE', color: 'purple' }\n];";
const folderRepl =
  "  { id: 'f-scholar-explore', name: 'SCHOLAR EXPLORE', color: 'purple' },\n" +
  "  { id: 'f-envir', name: 'ENVIR', color: 'teal' }\n];";

if (!s.includes(folderNeedle)) {
  if (s.includes("'f-envir'")) {
    console.log('folder already patched');
  } else {
    console.error('folder needle missing');
    process.exit(1);
  }
} else {
  s = s.replace(folderNeedle, folderRepl);
}

const envir = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'envir', 'envir.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const paper = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'envir', 'paper.txt'), 'utf8').replace(/\r\n/g, '\n').trimEnd();

function escTemplate(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

if (s.includes("'default-envir-academic'")) {
  console.log('prompts already seeded');
} else {
  const titleAcademic = 'envir: ' + '\uD559\uC220 \uC11C\uC220 \uC124\uC815';
  const titlePaper = 'paper: STEP 1 ' + '\uB17C\uBB38 \uC9C0\uC2DD\uC758 \uC9C0\uB3C4';
  const block =
    ',\n' +
    '  {\n' +
    "    id: 'default-envir-academic',\n" +
    "    title: '" +
    titleAcademic.replace(/'/g, "\\'") +
    "',\n" +
    "    folderId: 'f-envir',\n" +
    "    tags: 'envir, academic',\n" +
    '    isFavorite: false,\n' +
    "    ts: '2026-04-14T00:00:00.000Z',\n" +
    '    content: `' +
    escTemplate(envir) +
    '`\n' +
    '  },\n' +
    '  {\n' +
    "    id: 'default-envir-paper-step1',\n" +
    "    title: '" +
    titlePaper.replace(/'/g, "\\'") +
    "',\n" +
    "    folderId: 'f-envir',\n" +
    "    tags: 'envir, paper, step1',\n" +
    '    isFavorite: false,\n' +
    "    ts: '2026-04-14T00:00:01.000Z',\n" +
    '    content: `' +
    escTemplate(paper) +
    '`\n' +
    '  }';

  const promptNeedle = "\n{  id: 'default-explore-step6',";
  if (!s.includes(promptNeedle)) {
    console.error('prompt needle missing');
    process.exit(1);
  }
  s = s.replace(promptNeedle, block + '\n{  id: \'default-explore-step6\',');
}

fs.writeFileSync(promptsPath, s, 'utf8');
console.log('prompts.js updated');
