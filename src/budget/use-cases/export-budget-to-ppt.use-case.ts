import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PptxGenJS from 'pptxgenjs';
import { Church } from '../../churches/entities/church.entity';
import { GetBudgetExecutionUseCase } from './get-budget-execution.use-case';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

@Injectable()
export class ExportBudgetToPptUseCase {
  constructor(
    @InjectRepository(Church)
    private readonly churchRepository: Repository<Church>,
    private readonly getBudgetExecutionUseCase: GetBudgetExecutionUseCase,
  ) {}

  async execute(churchId: string, periodId: string): Promise<Buffer> {
    const church = await this.churchRepository.findOneBy({ id: churchId });
    if (!church) throw new NotFoundException('Iglesia no encontrada');

    const execution = await this.getBudgetExecutionUseCase.execute(churchId, periodId);
    
    const pptx = new ((PptxGenJS as any).default || PptxGenJS)();
    pptx.layout = 'LAYOUT_16x9';

    this.addSlideCover(pptx, church, execution);
    this.addSlideSummary(pptx, execution, church.baseCurrency);
    this.addSlideExecution(pptx, execution, church.baseCurrency);
    this.addAllocationSlides(pptx, execution, church.baseCurrency);
    this.addFinalSlide(pptx, execution, church.baseCurrency);

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return buffer as Buffer;
  }

  private addSlideCover(pptx: any, church: Church, execution: any) {
    const slide = pptx.addSlide();
    
    // Background color/branding
    slide.background = { color: 'F1F5F9' };

    slide.addText(church.name, {
      x: 0.5, y: 1.5, w: '90%', h: 1, 
      fontSize: 36, bold: true, color: '1E293B', align: 'center'
    });

    slide.addText(`Presupuesto: ${execution.period.name}`, {
      x: 0.5, y: 2.5, w: '90%', h: 0.8, 
      fontSize: 28, color: '334155', align: 'center'
    });

    slide.addText(`Período: ${format(new Date(execution.period.startDate), 'dd/MM/yyyy')} - ${format(new Date(execution.period.endDate), 'dd/MM/yyyy')}`, {
      x: 0.5, y: 3.5, w: '90%', fontSize: 18, color: '64748B', align: 'center'
    });

    slide.addText(`Fecha de reporte: ${format(new Date(), 'PPP', { locale: es })}`, {
      x: 0.5, y: 5.0, w: '90%', fontSize: 14, color: '94A3B8', align: 'center'
    });
  }

  private addSlideSummary(pptx: any, execution: any, currency: string) {
    const slide = pptx.addSlide();
    slide.addText('Resumen de Proyección (Coherencia)', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '0F172A' });

    const c = execution.coherence;
    const rows = [
      [{ text: 'Concepto' }, { text: 'Monto Presupuestado' }],
      [{ text: 'Total Ingresos Estipulados' }, { text: this.formatCurrency(c.totalIncomeBudgeted, currency) }],
      [{ text: 'Total Egresos Estipulados' }, { text: this.formatCurrency(c.totalExpenseBudgeted, currency) }],
      [{ text: 'Balance Proyectado' }, { text: this.formatCurrency(c.projectedBalance, currency) }]
    ];

    slide.addTable(rows as any, {
      x: 0.5, y: 1.5, w: 9, 
      border: { type: 'solid', color: 'E2E8F0', pt: 1 },
      fill: { color: 'FFFFFF' },
      fontSize: 18,
      autoPage: true,
      colW: [5, 4]
    });

    slide.addText(`Moneda base: ${currency}`, { x: 0.5, y: 5.0, fontSize: 12, color: '64748B' });
  }

  private addSlideExecution(pptx: any, execution: any, currency: string) {
    const slide = pptx.addSlide();
    slide.addText('Estado de Ejecución Real', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '0F172A' });

    const c = execution.coherence;
    const incPct = c.totalIncomeBudgeted > 0 ? (c.totalIncomeActual / c.totalIncomeBudgeted * 100).toFixed(1) : '0';
    const expPct = c.totalExpenseBudgeted > 0 ? (c.totalExpenseActual / c.totalExpenseBudgeted * 100).toFixed(1) : '0';

    const rows = [
      [{ text: 'Concepto' }, { text: 'Presupuestado' }, { text: 'Real' }, { text: '% Ejecución' }],
      [{ text: 'Ingresos' }, { text: this.formatCurrency(c.totalIncomeBudgeted, currency) }, { text: this.formatCurrency(c.totalIncomeActual, currency) }, { text: `${incPct}%` }],
      [{ text: 'Egresos' }, { text: this.formatCurrency(c.totalExpenseBudgeted, currency) }, { text: this.formatCurrency(c.totalExpenseActual, currency) }, { text: `${expPct}%` }],
      [{ text: 'Balance Neto' }, { text: this.formatCurrency(c.projectedBalance, currency) }, { text: this.formatCurrency(c.actualBalance, currency) }, { text: '-' }]
    ];

    slide.addTable(rows as any, {
      x: 0.5, y: 1.5, w: 9,
      border: { type: 'solid', color: 'E2E8F0', pt: 1 },
      fontSize: 16,
      colW: [3, 2, 2, 2],
      autoPage: true
    });
  }

  private addAllocationSlides(pptx: any, execution: any, currency: string) {
    const allocations = execution.allocations;
    if (!allocations.length) return;

    // Grouping by type and ministry/category for better presentation
    // But for a simple version, we use tables that auto-page
    const slide = pptx.addSlide();
    slide.addText('Detalle por Ministerio / Categoría', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '0F172A' });

    const tableRows = [
      [{ text: 'Categoría/Ministerio' }, { text: 'Pres.' }, { text: 'Ejec.' }, { text: 'Rest.' }, { text: '%' }]
    ];

    allocations.forEach((acc: any) => {
      const name = acc.ministry ? `${acc.ministry.name}` : (acc.category ? acc.category.name : 'Varios');
      tableRows.push([
        { text: name },
        { text: this.formatCurrency(acc.allocatedAmount, currency) },
        { text: this.formatCurrency(acc.executedAmount, currency) },
        { text: this.formatCurrency(acc.remainingAmount, currency) },
        { text: `${acc.usagePercentage}%` }
      ]);
    });

    slide.addTable(tableRows as any, {
      x: 0.5, y: 1.2, w: 9,
      fontSize: 11,
      colW: [3, 1.5, 1.5, 1.5, 1.5],
      autoPage: true, // This automatically creates new slides if the table is too long
      border: { type: 'solid', color: 'CBD5E1', pt: 0.5 },
      fill: { color: 'F8FAFC' },
      rowH: 0.3
    });
  }

  private addFinalSlide(pptx: any, execution: any, currency: string) {
    const slide = pptx.addSlide();
    const balance = execution.coherence.actualBalance;
    const isSurplus = balance >= 0;

    slide.addText(isSurplus ? '¡Balance Saludable!' : 'Atención: Déficit Detectado', {
        x: 0.5, y: 2.0, w: '90%', fontSize: 32, bold: true, 
        color: isSurplus ? '059669' : 'DC2626', align: 'center'
    });

    slide.addText(`Resultado neto actual: ${this.formatCurrency(balance, currency)}`, {
        x: 0.5, y: 3.0, w: '90%', fontSize: 24, color: '334155', align: 'center'
    });

    slide.addText('Reporte generado para fines administrativos.', {
        x: 0.5, y: 5.0, w: '90%', fontSize: 12, italic: true, color: '94A3B8', align: 'center'
    });
  }

  private formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);
  }
}
