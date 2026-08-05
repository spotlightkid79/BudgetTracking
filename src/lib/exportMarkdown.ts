import type { BudgetData, Category, Transaction } from '../types';
import { formatCurrency, formatMonthLabel, monthKeyOf } from './format';
import { downloadTextFile } from './download';

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function categoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

function transactionsTable(transactions: Transaction[], categories: Map<string, Category>): string {
  const rows = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => {
      const category = categories.get(t.categoryId)?.name ?? 'Unknown';
      const sign = t.type === 'income' ? '+' : '-';
      return `| ${t.date} | ${t.type} | ${escapeCell(category)} | ${sign}${formatCurrency(t.amount)} | ${escapeCell(t.note)} |`;
    });
  return ['| Date | Type | Category | Amount | Note |', '|---|---|---|---|---|', ...rows].join('\n');
}

export function generateBudgetMarkdown(data: BudgetData): string {
  const categories = categoryMap(data.categories);
  const now = new Date();

  const totalIncome = data.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = data.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const lines: string[] = [];

  lines.push('# Budgetly Export');
  lines.push('');
  lines.push(
    `Generated on ${now.toLocaleDateString(undefined, { dateStyle: 'long' })} at ${now.toLocaleTimeString(undefined, { timeStyle: 'short' })}`
  );
  lines.push('');

  lines.push('## Overview');
  lines.push('');
  lines.push(`- **Total income:** ${formatCurrency(totalIncome)}`);
  lines.push(`- **Total expenses:** ${formatCurrency(totalExpenses)}`);
  lines.push(`- **Net balance:** ${formatCurrency(netBalance)}`);
  lines.push(`- **Transactions:** ${data.transactions.length}`);
  lines.push(`- **Categories:** ${data.categories.length}`);
  lines.push(`- **Budgets set:** ${data.budgets.length}`);
  lines.push(`- **Recurring rules:** ${data.recurring.length}`);
  lines.push('');

  lines.push('## Categories');
  lines.push('');
  lines.push('| Name | Type |');
  lines.push('|---|---|');
  for (const c of data.categories) {
    lines.push(`| ${escapeCell(c.name)} | ${c.type} |`);
  }
  lines.push('');

  if (data.budgets.length > 0) {
    lines.push('## Budgets');
    lines.push('');
    lines.push('| Category | Monthly limit |');
    lines.push('|---|---|');
    for (const b of data.budgets) {
      const name = categories.get(b.categoryId)?.name ?? 'Unknown';
      lines.push(`| ${escapeCell(name)} | ${formatCurrency(b.monthlyLimit)} |`);
    }
    lines.push('');
  }

  if (data.recurring.length > 0) {
    lines.push('## Recurring transactions');
    lines.push('');
    lines.push('| Category | Type | Amount | Frequency | Start date | Note |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of data.recurring) {
      const name = categories.get(r.categoryId)?.name ?? 'Unknown';
      lines.push(
        `| ${escapeCell(name)} | ${r.type} | ${formatCurrency(r.amount)} | ${r.frequency} | ${r.startDate} | ${escapeCell(r.note)} |`
      );
    }
    lines.push('');
  }

  lines.push('## Transactions');
  lines.push('');

  const monthKeys = Array.from(new Set(data.transactions.map((t) => monthKeyOf(t.date)))).sort(
    (a, b) => b.localeCompare(a)
  );

  if (monthKeys.length === 0) {
    lines.push('_No transactions yet._');
    lines.push('');
  }

  for (const monthKey of monthKeys) {
    const monthTransactions = data.transactions.filter((t) => monthKeyOf(t.date) === monthKey);
    const monthIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthExpenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    lines.push(`### ${formatMonthLabel(monthKey)}`);
    lines.push('');
    lines.push(transactionsTable(monthTransactions, categories));
    lines.push('');
    lines.push(
      `**Month total** — Income: ${formatCurrency(monthIncome)} · Expenses: ${formatCurrency(monthExpenses)} · Net: ${formatCurrency(monthIncome - monthExpenses)}`
    );
    lines.push('');
  }

  return lines.join('\n');
}

export function exportBudgetAsMarkdown(data: BudgetData): void {
  const today = new Date().toISOString().slice(0, 10);
  const content = generateBudgetMarkdown(data);
  downloadTextFile(`budgetly-export-${today}.md`, content);
}
