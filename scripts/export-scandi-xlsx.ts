/**
 * Export Scandinavian gym leads to xlsx + txt
 */
import { Workbook } from 'openpyxl';
import { readFileSync, writeFileSync } from 'fs';

interface FoundLead {
  handle: string;
  name: string;
  city: string | null;
  country: string;
  discipline: string;
  source: string;
  snippet: string;
}

function main() {
  const leads: FoundLead[] = JSON.parse(readFileSync('/tmp/scandi_gym_leads.json', 'utf-8'));

  // Sort by country then name
  leads.sort((a, b) => {
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    return a.name.localeCompare(b.name);
  });

  // --- XLSX ---
  const wb = new Workbook();
  wb.properties.creator = 'GymReach Hunter';

  const ws = wb.active;
  ws.title = 'Scandinavian Gym Leads';

  // Headers
  const headers = ['Country', 'Gym Name', 'Instagram Handle', 'Instagram URL', 'City', 'Discipline', 'Source', 'Verified'];
  headers.forEach((h, i) => {
    const cell = ws.cell(1, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'F43F5E' } };
    cell.font = { bold: true, size: 12, color: { rgb: 'FFFFFF' } };
  });

  // Data
  leads.forEach((lead, idx) => {
    const row = idx + 2;
    ws.cell(row, 1).value = lead.country;
    ws.cell(row, 2).value = lead.name;
    ws.cell(row, 3).value = '@' + lead.handle;
    ws.cell(row, 4).value = `https://instagram.com/${lead.handle}`;
    ws.cell(row, 5).value = lead.city || '';
    ws.cell(row, 6).value = lead.discipline || '';
    ws.cell(row, 7).value = lead.source;
    ws.cell(row, 8).value = lead.source === 'web' ? 'Yes' : 'Verify';

    // Color code by country
    const colors: Record<string, string> = {
      Denmark: 'E8F5E9',
      Norway: 'E3F2FD',
      Sweden: 'FFF3E0',
    };
    ws.cell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: colors[lead.country] || 'F5F5F5' } };
  });

  // Column widths
  const widths = [12, 30, 25, 45, 18, 18, 10, 10];
  widths.forEach((w, i) => {
    ws.column(i + 1).width = w;
  });

  // Freeze header row
  ws.freezePanes = 'A2';

  // Add a summary sheet
  const summary = wb.createSheet('Summary');
  summary.cell(1, 1).value = 'Scandinavian Gym Leads Summary';
  summary.cell(1, 1).font = { bold: true, size: 16 };
  summary.cell(3, 1).value = 'Country';
  summary.cell(3, 2).value = 'Total Leads';
  summary.cell(3, 3).value = 'Verified (web search)';
  summary.cell(3, 4).value = 'To verify (LLM)';

  const byCountry: Record<string, { total: number; web: number; llm: number }> = {};
  for (const lead of leads) {
    if (!byCountry[lead.country]) byCountry[lead.country] = { total: 0, web: 0, llm: 0 };
    byCountry[lead.country].total++;
    if (lead.source === 'web') byCountry[lead.country].web++;
    else byCountry[lead.country].llm++;
  }

  let row = 4;
  for (const country of ['Denmark', 'Norway', 'Sweden']) {
    const c = byCountry[country] || { total: 0, web: 0, llm: 0 };
    summary.cell(row, 1).value = country;
    summary.cell(row, 2).value = c.total;
    summary.cell(row, 3).value = c.web;
    summary.cell(row, 4).value = c.llm;
    row++;
  }
  summary.cell(row, 1).value = 'TOTAL';
  summary.cell(row, 2).value = leads.length;
  summary.cell(row, 1).font = { bold: true };

  summary.column(1).width = 15;
  summary.column(2).width = 15;
  summary.column(3).width = 25;
  summary.column(4).width = 20;

  // Save xlsx
  wb.save('/home/z/my-project/download/scandinavian-gym-leads.xlsx');

  // --- TXT file ---
  let txt = 'SCANDINAVIAN GYM LEADS\n';
  txt += 'MMA / Muay Thai / Boxing / BJJ / Kickboxing\n';
  txt += `Total: ${leads.length} leads\n`;
  txt += `Generated: ${new Date().toISOString().slice(0, 10)}\n`;
  txt += '='.repeat(60) + '\n\n';

  let currentCountry = '';
  for (const lead of leads) {
    if (lead.country !== currentCountry) {
      currentCountry = lead.country;
      const count = byCountry[currentCountry]?.total || 0;
      txt += `\n${'='.repeat(60)}\n`;
      txt += `${currentCountry.toUpperCase()} (${count} leads)\n`;
      txt += `${'='.repeat(60)}\n\n`;
    }
    txt += `${lead.name}\n`;
    txt += `  IG: @${lead.handle}\n`;
    txt += `  URL: https://instagram.com/${lead.handle}\n`;
    if (lead.city) txt += `  City: ${lead.city}\n`;
    if (lead.discipline) txt += `  Discipline: ${lead.discipline}\n`;
    txt += `  Source: ${lead.source}\n`;
    txt += '\n';
  }

  writeFileSync('/home/z/my-project/download/scandinavian-gym-leads.txt', txt);

  console.log(`Exported ${leads.length} leads:`);
  for (const country of ['Denmark', 'Norway', 'Sweden']) {
    const c = byCountry[country] || { total: 0, web: 0, llm: 0 };
    console.log(`  ${country}: ${c.total} (${c.web} verified, ${c.llm} to verify)`);
  }
  console.log('\nFiles created:');
  console.log('  /home/z/my-project/download/scandinavian-gym-leads.xlsx');
  console.log('  /home/z/my-project/download/scandinavian-gym-leads.txt');
}

main();
