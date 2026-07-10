import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const CONFIG = [
  ['pages/login/Login.css', 'login-container'],
  ['pages/admin-page/AdminPage.css', 'admin-page'],
  ['pages/manager-page/ManagerPage.css', 'manager-page'],
  ['pages/employee-page/EmployeePage.css', 'employee-page'],
  ['pages/supervisor-page/SupervisorPage.css', 'supervisor-page'],
  ['components/Dashboard.css', 'dashboard-page'],
  ['components/Sidebar.css', 'sidebar'],
  ['components/AdminAllRequest.css', 'admin-all-container'],
  ['components/AdminApproveRequest.css', 'admin-approve-container'],
  ['components/ManagerApproveRequest.css', 'manager-approve-container'],
  ['components/SupervisorApproveRequest.css', 'supervisor-approve-container'],
  ['components/RequestPTO.css', 'request-pto-container'],
  ['components/MyRequest.css', 'my-request-container'],
  ['components/Users.css', 'users-container'],
  ['components/DepartmentMembers.css', 'department-members-container'],
  ['components/TeamMembers.css', 'team-members-container'],
  ['components/Calendar.css', 'calendar-container'],
];

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i += 1) {
    if (content[i] === '{') depth += 1;
    else if (content[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return content.length - 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAlreadyScoped(selector, scopeClass) {
  const s = selector.trim();
  return (
    s === scopeClass ||
    s.startsWith(`${scopeClass} `) ||
    s.startsWith(`${scopeClass}:`) ||
    s.startsWith(`${scopeClass},`) ||
    s.startsWith(`${scopeClass}.`) ||
    s.startsWith(`${scopeClass}>`) ||
    s.startsWith(`${scopeClass}+`) ||
    s.startsWith(`${scopeClass}~`) ||
    s.startsWith(`${scopeClass}[`)
  );
}

function prefixSelectorList(selectorPart, scopeClass) {
  return selectorPart
    .split(',')
    .map((raw) => {
      const selector = raw.trim();
      if (!selector) return selector;
      if (isAlreadyScoped(selector, scopeClass)) return selector;
      return `${scopeClass} ${selector}`;
    })
    .join(',\n');
}

function processRules(content, scopeClass, addPrefix) {
  let out = '';
  let pos = 0;

  while (pos < content.length) {
    while (pos < content.length && /\s/.test(content[pos])) {
      pos += 1;
    }
    if (pos >= content.length) break;

    if (content.slice(pos, pos + 2) === '/*') {
      const end = content.indexOf('*/', pos + 2);
      if (end === -1) {
        out += content.slice(pos);
        break;
      }
      out += content.slice(pos, end + 2);
      pos = end + 2;
      continue;
    }

    if (content[pos] === '@') {
      const braceStart = content.indexOf('{', pos);
      if (braceStart === -1) {
        out += content.slice(pos);
        break;
      }

      const atRule = content.slice(pos, braceStart).trim();
      const closeBrace = findMatchingBrace(content, braceStart);
      const inner = content.slice(braceStart + 1, closeBrace);

      if (/^@keyframes\b/.test(atRule)) {
        out += `${content.slice(pos, closeBrace + 1)}\n`;
      } else if (/^@(media|supports)\b/.test(atRule)) {
        out += `${atRule} {\n`;
        out += processRules(inner, scopeClass, addPrefix);
        out += '}\n';
      } else {
        out += `${content.slice(pos, closeBrace + 1)}\n`;
      }

      pos = closeBrace + 1;
      continue;
    }

    const braceStart = content.indexOf('{', pos);
    if (braceStart === -1) {
      out += content.slice(pos);
      break;
    }

    const selectorPart = content.slice(pos, braceStart).trim();
    const closeBrace = findMatchingBrace(content, braceStart);
    const body = content.slice(braceStart + 1, closeBrace);

    if (addPrefix && selectorPart) {
      out += `${prefixSelectorList(selectorPart, scopeClass)} {${body}}\n`;
    } else {
      out += `${content.slice(pos, closeBrace + 1)}\n`;
    }

    pos = closeBrace + 1;
  }

  return out;
}

function repairBrokenScope(css, scope) {
  const scopeClass = `.${scope}`;
  const bare = escapeRegExp(scope);
  let fixed = css.replace(/\r\n/g, '\n');

  fixed = fixed.replace(new RegExp(`${scopeClass.replace('.', '\\.')} @media`, 'g'), '@media');
  fixed = fixed.replace(new RegExp(`(^|[\\n\\}]\\s*)${bare}(?=\\s|[\\.{:#\\[,])`, 'g'), `$1${scopeClass}`);

  let prev;
  do {
    prev = fixed;
    fixed = fixed.replace(
      new RegExp(`${escapeRegExp(scopeClass)}\\s+${escapeRegExp(scopeClass)}(?=\\s|[\\.{:#\\[,])`, 'g'),
      scopeClass
    );
  } while (fixed !== prev);

  return fixed;
}

function fixMediaBlocks(css, scopeClass) {
  let result = '';
  let pos = 0;

  while (pos < css.length) {
    const mediaIdx = css.indexOf('@media', pos);
    if (mediaIdx === -1) {
      result += css.slice(pos);
      break;
    }

    result += css.slice(pos, mediaIdx);
    const braceStart = css.indexOf('{', mediaIdx);
    const closeBrace = findMatchingBrace(css, braceStart);
    const atRule = css.slice(mediaIdx, braceStart);
    const inner = css.slice(braceStart + 1, closeBrace);
    const prefixedInner = processRules(inner, scopeClass, true);

    result += `${atRule.trim()} {\n${prefixedInner}}`;
    pos = closeBrace + 1;
  }

  return result;
}

function finalizeCss(css, scope) {
  const scopeClass = `.${scope}`;
  const repaired = repairBrokenScope(css, scope);
  const withMedia = fixMediaBlocks(repaired, scopeClass);
  return `${withMedia.trimEnd()}\n`;
}

for (const [relativePath, scope] of CONFIG) {
  const filePath = path.join(srcDir, relativePath);
  const original = fs.readFileSync(filePath, 'utf8');
  const scoped = finalizeCss(original, scope);
  fs.writeFileSync(filePath, scoped, 'utf8');
  console.log(`Fixed ${relativePath} -> .${scope}`);
}

console.log('Done.');
