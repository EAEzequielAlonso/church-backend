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

  private readonly COLORS = {
    PRIMARY: '059669', // Emerald 600
    SECONDARY: '1E293B', // Slate 800
    ACCENT: 'F1F5F9', // Slate 100
    TEXT_MAIN: '0F172A', // Slate 900
    TEXT_MUTED: '64748B', // Slate 500
    WHITE: 'FFFFFF',
    SUCCESS: '16A34A',
    DANGER: 'DC2626',
    WARNING: 'D97706'
  };

  async execute(churchId: string, periodId: string): Promise<Buffer> {
    const church = await this.churchRepository.findOneBy({ id: churchId });
    if (!church) throw new NotFoundException('Iglesia no encontrada');

    const execution = await this.getBudgetExecutionUseCase.execute(churchId, periodId);
    
    const pptx = new ((PptxGenJS as any).default || PptxGenJS)();
    pptx.layout = 'LAYOUT_16x9';
    pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: 'FFFFFF' },
        objects: [
            { rect: { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: this.COLORS.PRIMARY } } },
            { text: { text: 'Elyon.app - Gestión Presupuestaria', options: { x: 0.5, y: 5.3, w: 4, h: 0.3, fontSize: 10, color: this.COLORS.TEXT_MUTED } } }
        ]
    });

    await this.addSlideCover(pptx, church, execution);
    this.addSlideSummary(pptx, execution, church.baseCurrency);
    this.addSlideExecution(pptx, execution, church.baseCurrency);
    this.addAllocationSlides(pptx, execution, church.baseCurrency);
    this.addFinalSlide(pptx, execution, church.baseCurrency);

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return buffer as Buffer;
  }

  private async addSlideCover(pptx: any, church: Church, execution: any) {
    const slide = pptx.addSlide();
    
    // Background Decoration
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '35%', h: '100%', fill: { color: this.COLORS.SECONDARY } });
    
    // Logo
    if (church.logoUrl) {
        slide.addImage({ path: church.logoUrl, x: 0.8, y: 0.5, w: 1.5, h: 1.5 });
    }

    slide.addText(church.name, {
      x: 3.5, y: 1.8, w: '60%', h: 1, 
      fontSize: 44, bold: true, color: this.COLORS.PRIMARY, align: 'left'
    });

    slide.addText(`Informe de Ejecución Presupuestaria`, {
      x: 3.5, y: 3.2, w: '60%', h: 0.8, 
      fontSize: 28, color: this.COLORS.SECONDARY, align: 'left'
    });

    slide.addText(`${execution.period.name}`, {
        x: 0.5, y: 4.0, w: 2.5, h: 0.5,
        fontSize: 18, bold: true, color: this.COLORS.WHITE, align: 'center'
    });

    slide.addText(`${format(new Date(execution.period.startDate), 'dd/MM/yyyy')} - ${format(new Date(execution.period.endDate), 'dd/MM/yyyy')}`, {
      x: 0.5, y: 4.7, w: 2.5, fontSize: 12, color: 'CBD5E1', align: 'center'
    });

    slide.addShape(pptx.ShapeType.line, { x: 3.5, y: 4.5, w: 5.5, h: 0, line: { color: this.COLORS.PRIMARY, width: 2 } });

    slide.addText(`Generado: ${format(new Date(), 'PPP', { locale: es })}`, {
      x: 3.5, y: 4.8, w: '60%', fontSize: 14, color: this.COLORS.TEXT_MUTED, align: 'left'
    });
  }

  private addSlideSummary(pptx: any, execution: any, currency: string) {
    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide.addText('Proyección del Período', { x: 0.5, y: 0.4, fontSize: 28, bold: true, color: this.COLORS.TEXT_MAIN });

    const c = execution.coherence;

    const cards = [
        { label: 'INGRESOS PROYECTADOS', val: c.totalIncomeBudgeted, x: 0.5, color: this.COLORS.PRIMARY },
        { label: 'EGRESOS PROYECTADOS', val: c.totalExpenseBudgeted, x: 3.5, color: this.COLORS.DANGER },
        { label: 'BALANCE PROYECTADO', val: c.projectedBalance, x: 6.5, color: this.COLORS.SECONDARY }
    ];

    cards.forEach(card => {
        slide.addShape(pptx.ShapeType.rect, { x: card.x, y: 1.5, w: 2.8, h: 1.5, fill: { color: this.COLORS.ACCENT }, line: { color: 'CBD5E1', width: 1 } });
        slide.addText(card.label, { x: card.x + 0.1, y: 1.6, w: 2.6, fontSize: 10, color: this.COLORS.TEXT_MUTED, align: 'center' });
        slide.addText(this.formatCurrency(card.val, currency), { x: card.x + 0.1, y: 2.2, w: 2.6, fontSize: 22, bold: true, color: card.color, align: 'center' });
    });

    slide.addText(`Análisis de Coherencia: El balance proyectado para este período es de ${this.formatCurrency(c.projectedBalance, currency)}.`, {
        x: 0.5, y: 3.5, w: 9, fontSize: 14, color: this.COLORS.TEXT_MAIN
    });
  }

  private addSlideExecution(pptx: any, execution: any, currency: string) {
    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide.addText('Ejecución Acumulada', { x: 0.5, y: 0.4, fontSize: 28, bold: true, color: this.COLORS.TEXT_MAIN });

    const c = execution.coherence;
    const incPct = c.totalIncomeBudgeted > 0 ? (c.totalIncomeActual / c.totalIncomeBudgeted * 100).toFixed(1) : '0';
    const expPct = c.totalExpenseBudgeted > 0 ? (c.totalExpenseActual / c.totalExpenseBudgeted * 100).toFixed(1) : '0';

    const rows = [
      [
        { text: 'Concepto', options: { fill: this.COLORS.SECONDARY, color: this.COLORS.WHITE, bold: true } }, 
        { text: 'Presp.', options: { fill: this.COLORS.SECONDARY, color: this.COLORS.WHITE, bold: true, align: 'right' } }, 
        { text: 'Real', options: { fill: this.COLORS.SECONDARY, color: this.COLORS.WHITE, bold: true, align: 'right' } }, 
        { text: '%', options: { fill: this.COLORS.SECONDARY, color: this.COLORS.WHITE, bold: true, align: 'right' } }
      ],
      [{ text: 'INGRESOS' }, { text: this.formatCurrency(c.totalIncomeBudgeted, currency) }, { text: this.formatCurrency(c.totalIncomeActual, currency) }, { text: `${incPct}%` }],
      [{ text: 'EGRESOS' }, { text: this.formatCurrency(c.totalExpenseBudgeted, currency) }, { text: this.formatCurrency(c.totalExpenseActual, currency) }, { text: `${expPct}%` }],
      [{ text: 'BALANCE NETO' }, { text: this.formatCurrency(c.projectedBalance, currency) }, { text: this.formatCurrency(c.actualBalance, currency) }, { text: '-' }]
    ];

    slide.addTable(rows as any, {
      x: 0.5, y: 1.2, w: 9,
      border: { type: 'solid', color: 'CBD5E1', pt: 0.5 },
      fontSize: 18,
      colW: [4, 1.8, 1.8, 1.4],
      rowH: 0.6,
      align: 'left',
      valign: 'middle'
    });

    const balanceColor = c.actualBalance >= 0 ? this.COLORS.SUCCESS : this.COLORS.DANGER;
    slide.addShape(pptx.ShapeType.rect, { x: 6.5, y: 4.0, w: 3, h: 1, fill: { color: balanceColor } });
    slide.addText('BALANCE REAL', { x: 6.6, y: 4.1, w: 2.8, fontSize: 10, color: this.COLORS.WHITE, align: 'center' });
    slide.addText(this.formatCurrency(c.actualBalance, currency), { x: 6.6, y: 4.4, w: 2.8, fontSize: 20, bold: true, color: this.COLORS.WHITE, align: 'center' });
  }

  private addAllocationSlides(pptx: any, execution: any, currency: string) {
    const allocations = execution.allocations;
    if (!allocations.length) return;

    const dataRows = allocations.map((acc: any, i: number) => {
        const name = acc.ministry ? `${acc.ministry.name}` : (acc.category ? acc.category.name : 'Varios');
        const fill = i % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
        const statusColor = acc.status === 'EXCEEDED' ? this.COLORS.DANGER : (acc.status === 'WARNING_80' ? this.COLORS.WARNING : this.COLORS.SUCCESS);
        
        return [
            { text: name, options: { fill } },
            { text: this.formatCurrency(acc.allocatedAmount, currency), options: { fill, align: 'right' } },
            { text: this.formatCurrency(acc.executedAmount, currency), options: { fill, align: 'right' } },
            { text: this.formatCurrency(acc.remainingAmount, currency), options: { fill, align: 'right' } },
            { text: `${Math.round(acc.usagePercentage)}%`, options: { fill, align: 'right', color: statusColor, bold: true } }
        ];
    });

    const tableHeader = [
        { text: 'Categoría / Ministerio', options: { fill: this.COLORS.PRIMARY, color: this.COLORS.WHITE, bold: true } },
        { text: 'Presp.', options: { fill: this.COLORS.PRIMARY, color: this.COLORS.WHITE, bold: true, align: 'right' } },
        { text: 'Ejecut.', options: { fill: this.COLORS.PRIMARY, color: this.COLORS.WHITE, bold: true, align: 'right' } },
        { text: 'Restante', options: { fill: this.COLORS.PRIMARY, color: this.COLORS.WHITE, bold: true, align: 'right' } },
        { text: '%', options: { fill: this.COLORS.PRIMARY, color: this.COLORS.WHITE, bold: true, align: 'right' } }
    ];

    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide.addText('Detalle por Asignación', { x: 0.5, y: 0.4, fontSize: 28, bold: true, color: this.COLORS.TEXT_MAIN });

    slide.addTable([tableHeader, ...dataRows] as any, {
      x: 0.5, y: 1.0, w: 9,
      fontSize: 10,
      colW: [3.5, 1.4, 1.4, 1.4, 1.3],
      autoPage: true,
      border: { type: 'solid', color: 'CBD5E1', pt: 0.5 },
      rowH: 0.35,
      valign: 'middle'
    });
  }

  private addFinalSlide(pptx: any, execution: any, currency: string) {
    const slide = pptx.addSlide();
    const balance = execution.coherence.actualBalance;
    const isSurplus = balance >= 0;

    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: this.COLORS.SECONDARY } });

    slide.addText(isSurplus ? '¡ESTADO FINANCIERO SALUDABLE!' : 'ANÁLISIS DE RIESGO: DÉFICIT', {
        x: 1, y: 2.0, w: 8, fontSize: 36, bold: true, 
        color: isSurplus ? this.COLORS.PRIMARY : this.COLORS.DANGER, align: 'center'
    });

    slide.addText(`El resultado neto del período analizado arroja un saldo de ${this.formatCurrency(balance, currency)}.`, {
        x: 1, y: 3.2, w: 8, fontSize: 18, color: 'CBD5E1', align: 'center'
    });

    slide.addShape(pptx.ShapeType.line, { x: 4, y: 4.2, w: 2, h: 0, line: { color: this.COLORS.PRIMARY, width: 3 } });

    slide.addText('Elyon.app - Software de Gestión para Iglesias', {
        x: 1, y: 4.8, w: 8, fontSize: 10, color: '94A3B8', align: 'center'
    });
  }

  private formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);
  }
}
