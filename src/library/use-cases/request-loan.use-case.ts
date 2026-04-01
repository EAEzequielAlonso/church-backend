import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { RequestLoanDto } from '../dto/loan.dto';
import { BookStatus, LoanStatus, BookOwnershipType } from '../enums/library.enums';
import { CreateNotificationUseCase } from '../../notifications/use-cases/create-notification.use-case';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class RequestLoanUseCase {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(ChurchPerson)
    private memberRepo: Repository<ChurchPerson>,
    private notificationUseCase: CreateNotificationUseCase,
  ) { }

  async execute(churchId: string, memberId: string, dto: RequestLoanDto) {
    const savedLoan = await this.dataSource.transaction(async (manager) => {
      const bookRepo = manager.getRepository(Book);
      const loanRepo = manager.getRepository(Loan);

      // Lock the book row — NO relations here: PostgreSQL refuses FOR UPDATE on LEFT JOINs
      const book = await bookRepo.findOne({
        where: { id: dto.bookId, churchId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!book) throw new NotFoundException('Libro no encontrado');

      if (book.status !== BookStatus.AVAILABLE) {
        throw new BadRequestException('El libro no está disponible actualmente');
      }

      if (book.ownerMemberId === memberId) {
        throw new BadRequestException('No puedes solicitar un préstamo de tu propio libro');
      }

      const activeLoan = await loanRepo.findOne({
        where: {
          bookId: dto.bookId,
          churchId,
          status: In([LoanStatus.REQUESTED, LoanStatus.APPROVED, LoanStatus.DELIVERED]),
        },
      });
      if (activeLoan) {
        throw new BadRequestException('Ya existe un préstamo activo para este libro');
      }

      const borrower = await this.memberRepo.findOne({
        where: { id: memberId, churchId: churchId },
      });
      if (!borrower) throw new NotFoundException('Miembro no encontrado');

      const durationDays = dto.durationDays ?? 14;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + durationDays);

      const loan = loanRepo.create({
        bookId: dto.bookId,
        borrowerId: memberId,
        churchId,
        requestedAt: new Date(),
        dueDate,
        status: LoanStatus.REQUESTED,
      });

      return loanRepo.save(loan);
    });

    // ── Fire notifications AFTER the transaction succeeds ─────────────────
    // Notifications are non-critical; errors are swallowed inside the use-case.
    this.notifyOnRequest(savedLoan, dto, churchId).catch(() => { });

    return savedLoan;
  }

  private async notifyOnRequest(loan: Loan, dto: RequestLoanDto, churchId: string) {
    // Re-fetch the book to get ownership info (outside the lock)
    const book = await this.dataSource
      .getRepository(Book)
      .findOne({ where: { id: dto.bookId }, relations: ['ownerMember'] });

    if (!book) return;

    if (book.ownershipType === BookOwnershipType.MEMBER && book.ownerMemberId) {
      // Notify the book owner
      await this.notificationUseCase.execute({
        churchId,
        userId: book.ownerMemberId,
        type: NotificationType.LOAN_REQUESTED,
        title: 'Nueva solicitud de préstamo',
        message: `Alguien solicita tu libro "${book.title}". Revisá y aprobá o rechazá.`,
        entityType: 'LOAN',
        entityId: loan.id,
      });
    } else if (book.ownershipType === BookOwnershipType.CHURCH) {
      // Notify all LIBRARIANs - get members who have LIBRARIAN role
      const librarians = await this.dataSource
        .getRepository(ChurchPerson)
        .find({
          where: { churchId },
        })
        .then(members =>
          members.filter((m: any) =>
            Array.isArray(m.functionalRoles) && m.functionalRoles.includes('LIBRARIAN')
          )
        );

      const notifications = librarians.map((lib) => ({
        churchId,
        userId: lib.id,
        type: NotificationType.LOAN_REQUESTED,
        title: 'Nueva solicitud de préstamo',
        message: `Un miembro solicitó el libro institucional "${book.title}".`,
        entityType: 'LOAN',
        entityId: loan.id,
      }));
      await this.notificationUseCase.executeMany(notifications);
    }
  }
}
