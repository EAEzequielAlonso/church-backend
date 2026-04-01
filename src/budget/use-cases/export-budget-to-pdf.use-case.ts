import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import { Church } from '../../churches/entities/church.entity';
import { GetBudgetExecutionUseCase } from './get-budget-execution.use-case';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

@Injectable()
export class ExportBudgetToPdfUseCase {
  constructor(
    @InjectRepository(Church)
    private readonly churchRepository: Repository<Church>,
    private readonly getBudgetExecutionUseCase: GetBudgetExecutionUseCase,
  ) {}

  async execute(churchId: string, periodId: string): Promise<Buffer> {
    const church = await this.churchRepository.findOneBy({ id: churchId });
    if (!church) throw new NotFoundException('Iglesia no encontrada');

    const execution = await this.getBudgetExecutionUseCase.execute(
      churchId,
      periodId,
    );

    return new Promise(async (resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        margins: { top: 50, left: 50, right: 50, bottom: 20 },
        size: 'A4',
        bufferPages: true,
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // --- Header ---
      await this.generateHeader(doc, church, execution);

      // --- Summary Cards ---
      this.generateSummary(doc, execution, church.baseCurrency);

      // --- Allocations Table ---
      this.generateTable(doc, execution, church.baseCurrency);

      // --- Footer ---
      this.generateFooter(doc, execution.period.name);

      doc.end();
    });
  }

  private async generateHeader(doc: PDFKit.PDFDocument, church: Church, execution: any) {
    let textX = 50;

    if (church.logoUrl) {
      try {
        const response = await fetch(church.logoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        doc.image(buffer, 50, 45, { width: 50 });
        textX = 110;
      } catch (e) {
        console.warn('Could not load church logo for PDF', e);
      }
    }

    doc
      .fillColor('#1E293B')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(church.name.toUpperCase(), textX, 50);

    doc
      .fontSize(14)
      .fillColor('#64748B')
      .font('Helvetica')
      .text(`Informe de Ejecución Presupuestaria`, textX, 100);

    doc
      .fontSize(10)
      .fillColor('#334155')
      .text(`Período: ${execution.period.name}`, 50, 140)
      .text(`Emisión: ${format(new Date(), 'PPPP', { locale: es })}`, 50, 155);

    doc
      .moveTo(50, 175)
      .lineTo(550, 175)
      .strokeColor('#E2E8F0')
      .stroke();
  }

  private generateSummary(doc: PDFKit.PDFDocument, execution: any, currency: string) {
    const { coherence } = execution;
    const top = 200;

    // Box 1: Incomes
    doc
      .roundedRect(50, top, 245, 60, 5)
      .fillColor('#F8FAFC')
      .fill();
    
    doc
      .fillColor('#475569')
      .fontSize(9)
      .text('INGRESOS (PROYECTADO / REAL)', 60, top + 10);
    
    doc
      .fillColor('#16A34A')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`${this.formatCurrency(coherence.totalIncomeBudgeted, currency)} / ${this.formatCurrency(coherence.totalIncomeActual, currency)}`, 60, top + 30);

    // Box 2: Expenses
    doc
      .roundedRect(305, top, 245, 60, 5)
      .fillColor('#F8FAFC')
      .fill();
    
    doc
      .fillColor('#475569')
      .fontSize(9)
      .text('EGRESOS (PROYECTADO / REAL)', 315, top + 10);
    
    doc
      .fillColor('#DC2626')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(`${this.formatCurrency(coherence.totalExpenseBudgeted, currency)} / ${this.formatCurrency(coherence.totalExpenseActual, currency)}`, 315, top + 30);

    // Balance
    doc
      .roundedRect(50, top + 75, 500, 40, 5)
      .fillColor('#F1F5F9')
      .fill();
    
    doc
      .fillColor('#475569')
      .fontSize(10)
      .font('Helvetica')
      .text('BALANCE ACTUAL (REAL)', 65, top + 90);
    
    const balanceColor = coherence.actualBalance >= 0 ? '#16A34A' : '#DC2626';
    doc
      .fillColor(balanceColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(this.formatCurrency(coherence.actualBalance, currency), 400, top + 88, { align: 'right', width: 140 });
  }

  private generateTable(doc: PDFKit.PDFDocument, execution: any, currency: string) {
    let top = 345;
    
    doc
        .fillColor('#1E293B')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Detalle por Asignación', 50, top);
    
    top += 25;

    // Table Header
    doc
        .fillColor('#F1F5F9')
        .rect(50, top, 500, 20)
        .fill();
    
    doc
        .fillColor('#475569')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Categoría', 60, top + 5)
        .text('Presp.', 260, top + 5, { width: 60, align: 'right' })
        .text('Ejec.', 330, top + 5, { width: 60, align: 'right' })
        .text('Rest.', 400, top + 5, { width: 60, align: 'right' })
        .text('Prog.', 470, top + 5, { width: 30, align: 'right' })
        .text('Est.', 510, top + 5, { width: 40, align: 'center' });
    
    top += 20;

    doc.font('Helvetica');

    execution.allocations.forEach((alloc: any, i: number) => {
        if (top > 700) {
            doc.addPage();
            top = 50;
        }

        const bgColor = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
        doc.fillColor(bgColor).rect(50, top, 500, 20).fill();

        doc.fillColor('#334155').fontSize(8);
        const name = alloc.ministry ? `${alloc.ministry.name}` : (alloc.category ? alloc.category.name : '-');
        
        doc.text(name, 60, top + 6);
        doc.text(this.formatCurrency(alloc.allocatedAmount, currency), 260, top + 6, { width: 60, align: 'right' });
        doc.text(this.formatCurrency(alloc.executedAmount, currency), 330, top + 6, { width: 60, align: 'right' });
        doc.text(this.formatCurrency(alloc.remainingAmount, currency), 400, top + 6, { width: 60, align: 'right' });
        doc.text(`${Math.round(alloc.usagePercentage)}%`, 470, top + 6, { width: 30, align: 'right' });

        const statusColor = alloc.status === 'EXCEEDED' ? '#DC2626' : (alloc.status === 'WARNING_80' ? '#D97706' : '#16A34A');
        doc.fillColor(statusColor).text(alloc.status === 'OK' ? 'OK' : (alloc.status === 'WARNING_80' ? 'ALT' : 'SUP'), 510, top + 6, { width: 40, align: 'center' });

        top += 20;
    });
  }

  private generateFooter(doc: PDFKit.PDFDocument, periodName: string) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text(
                `Telyon.app | Página ${i + 1} de ${range.count} | ${periodName}`,
                50,
                doc.page.height - 30,
                { align: 'center', width: 500, lineBreak: false }
            );
    }
  }

  private formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
    }).format(amount);
  }
}
