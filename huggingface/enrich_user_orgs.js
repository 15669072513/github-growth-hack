// 为「蚂蚁huggingface用户名单.csv」增加一列"组织名"
// 数据源：https://huggingface.co/api/users/{username}/overview -> orgs[].fullname
//
// 用法：
//   node huggingface/enrich_user_orgs.js          # 全量跑批，写回原文件
//   TEST_LIMIT=3 node ...                         # 只处理前 3 个用户
//   OUTPUT=/tmp/out.csv node ...                  # 输出到其他文件（测试用）
//   HF_TOKEN=hf_xxx node ...                      # gated/限流场景带 token

const fs = require('fs');
const path = require('path');

const INPUT = process.env.INPUT || path.join(__dirname, '蚂蚁huggingface用户名单.csv');
const OUTPUT = process.env.OUTPUT || INPUT;
const LIMIT = process.env.TEST_LIMIT ? parseInt(process.env.TEST_LIMIT, 10) : Infinity;
const DELAY_MS = 300; // 请求间隔，避免触发限流
const TIMEOUT_MS = 15000;

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function csvField(v) {
  if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOverview(username) {
  const headers = { 'User-Agent': 'github-growth-hack/1.0' };
  if (process.env.HF_TOKEN) headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;
  const res = await fetch(
    `https://huggingface.co/api/users/${encodeURIComponent(username)}/overview`,
    { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }
  );
  if (res.status === 404) return { notFound: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

(async () => {
  const rows = parseCsv(fs.readFileSync(INPUT, 'utf8'));
  if (rows.length < 2) { console.error('名单为空'); process.exit(1); }
  rows[0].push('组织名');

  const users = rows.slice(1);
  const targets = users.slice(0, LIMIT);
  const failed = [];

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    const username = (row[0] || '').trim();
    if (!username || username === '-') { row.push('-'); continue; }

    let value = '-';
    try {
      const data = await fetchOverview(username).catch(async (e) => {
        if (e.message === 'HTTP 429') { await sleep(5000); return fetchOverview(username); }
        throw e;
      });
      if (data.notFound) {
        console.log(`[${i + 1}/${targets.length}] ${username}: 用户不存在`);
      } else {
        const orgs = Array.isArray(data.orgs) ? data.orgs : [];
        value = orgs.map((o) => o.fullname || o.name).filter(Boolean).join(';') || '-';
        console.log(`[${i + 1}/${targets.length}] ${username}: ${value}`);
      }
    } catch (e) {
      await sleep(2000);
      try {
        const data = await fetchOverview(username);
        if (!data.notFound) {
          const orgs = Array.isArray(data.orgs) ? data.orgs : [];
          value = orgs.map((o) => o.fullname || o.name).filter(Boolean).join(';') || '-';
        }
      } catch (e2) {
        failed.push({ username, error: e2.message });
        console.log(`[${i + 1}/${targets.length}] ${username}: 查询失败(${e2.message})`);
      }
    }
    row.push(value);
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  // 本次未处理的行补 '-' 占位，保证列数一致
  for (let i = targets.length; i < users.length; i++) users[i].push('-');

  fs.writeFileSync(OUTPUT, rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n', 'utf8');
  console.log(`\n完成：成功 ${targets.length - failed.length}，失败 ${failed.length}，已写入 ${OUTPUT}`);
  if (failed.length) {
    console.log('失败名单：', failed.map((f) => f.username).join(', '));
    console.log('失败行已置 "-"，重跑本脚本会重新查询这些用户');
  }
})();
