import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

import { User } from '../users/entities/user.entity';
// ... (rest of imports same)
import { Person } from '../users/entities/person.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Group } from '../groups/entities/group.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';
import { GroupMeeting } from '../groups/entities/group-meeting.entity';
import {
  GroupType,
  GroupRole,
  GroupVisibility,
} from '../groups/enums/group.enums';
import { Family } from '../families/entities/family.entity';
import { FamilyMember } from '../families/entities/family-member.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import {
  TransactionStatus,
  AccountType,
  TransactionType,
} from '../treasury/enums/treasury.enums';
import { Account } from '../treasury/entities/account.entity';
import { Book } from '../library/entities/book.entity';
import { Loan } from '../library/entities/loan.entity';

import { TransactionCategory } from '../treasury/entities/transaction-category.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { ServiceDuty } from '../ministries/entities/service-duty.entity';
import { ServiceDutyBehavior } from '../ministries/enums/service-duty-behavior.enum';
import {
  PlanType,
  SubscriptionStatus,
  EcclesiasticalRole,
  FunctionalRole,
  SystemRole,
  Sex,
  MaritalStatus,
  FamilyRole,
  FollowUpStatus,
  MinistryRole,
} from '../common/enums';
import { MembershipStatus } from '../members/enums/membership-status.enum';
import {
  BookOwnershipType,
  BookStatus,
  LoanStatus,
} from '../library/enums/library.enums';
import { BookCategory } from '../library/entities/book-category.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeedService');

  constructor(
    private dataSource: DataSource,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Person) private personRepository: Repository<Person>,
    @InjectRepository(Church) private churchRepository: Repository<Church>,
    @InjectRepository(ChurchPerson)
    private memberRepository: Repository<ChurchPerson>,
    @InjectRepository(Group) private groupRepository: Repository<Group>,
    @InjectRepository(GroupParticipant)
    private groupMemberRepository: Repository<GroupParticipant>,
    @InjectRepository(Family) private familyRepository: Repository<Family>,
    @InjectRepository(FamilyMember)
    private familyMemberRepository: Repository<FamilyMember>,
    @InjectRepository(TreasuryTransaction)
    private treasuryRepository: Repository<TreasuryTransaction>,
    @InjectRepository(Account) private accountRepository: Repository<Account>,
    @InjectRepository(TransactionCategory)
    private categoryRepository: Repository<TransactionCategory>,
    @InjectRepository(Book) private bookRepository: Repository<Book>,
    @InjectRepository(Loan) private loanRepository: Repository<Loan>,
    @InjectRepository(BookCategory) private bookCategoryRepository: Repository<BookCategory>,

    @InjectRepository(Ministry)
    private ministryRepository: Repository<Ministry>,
    @InjectRepository(MinistryMember)
    private ministryMemberRepository: Repository<MinistryMember>,
    @InjectRepository(ServiceDuty)
    private serviceDutyRepository: Repository<ServiceDuty>,
  ) { }

  async run() {
    console.error('!!!! SEED RUNNING !!!!');
    this.logger.log('Starting seeding process...');

    // Use path.resolve to point to the actual SOURCE file, NOT the compiled one in dist,
    // to be 100% sure we read what the user modified.
    const seedDataPath = path.resolve(
      process.cwd(),
      'src',
      'seed',
      'data',
      'initial-seed.json',
    );

    let seedData;
    try {
      const rawData = fs.readFileSync(seedDataPath, 'utf8');
      seedData = JSON.parse(rawData);
      this.logger.log(
        `Seed data loaded from JS disk. Churches found: ${seedData.churches.length}`,
      );
    } catch (e) {
      this.logger.error(
        `Could not load seed data from ${seedDataPath}: ${e.message}`,
      );
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ── Seed Book Categories (global – no churchId) ───────────────────────
      const DEFAULT_CATEGORIES = [
        { name: 'Teología', description: 'Libros de doctrina y teología sistemática', color: '#4f46e5' },
        { name: 'Biografía', description: 'Vidas de hombres y mujeres de fe', color: '#0891b2' },
        { name: 'Devocional', description: 'Libros para el crecimiento espiritual personal', color: '#16a34a' },
        { name: 'Predicación', description: 'Homilética y exposición bíblica', color: '#dc2626' },
        { name: 'Historia de la Iglesia', description: 'Historia del cristianismo', color: '#92400e' },
        { name: 'Familia y Matrimonio', description: 'Libros sobre la vida familiar', color: '#be185d' },
        { name: 'Liderazgo', description: 'Liderazgo cristiano y pastoral', color: '#7c3aed' },
        { name: 'Apologética', description: 'Defensa de la fe cristiana', color: '#f59e0b' },
        { name: 'Crecimiento Espiritual', description: 'Libros de madurez cristiana', color: '#10b981' },
        { name: 'Vida Cristiana', description: 'Consejos prácticos para el creyente', color: '#3b82f6' },
        { name: 'Estudio Bíblico', description: 'Guías y estudios de la Biblia', color: '#6366f1' },
        { name: 'Ficción Cristiana', description: 'Alegorías y novelas cristianas', color: '#ec4899' },
        { name: 'Varios', description: 'Otros libros', color: '#64748b' },
      ];
      for (const cat of DEFAULT_CATEGORIES) {
        const exists = await this.bookCategoryRepository.findOne({ where: { name: cat.name } });
        if (!exists) {
          await this.bookCategoryRepository.save(this.bookCategoryRepository.create(cat));
          this.logger.log(`📚 Created book category: ${cat.name}`);
        }
      }

      for (const churchData of seedData.churches) {
        let savedChurch = await this.churchRepository.findOne({
          where: { slug: churchData.slug },
        });

        if (savedChurch) {
          this.logger.log(
            `Church ${churchData.name} already exists. Checking for updates...`,
          );
        } else {
          this.logger.log(`Creating Church: ${churchData.name}`);
          const church = this.churchRepository.create({
            name: churchData.name,
            slug: churchData.slug,
            plan: PlanType.PRO,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            address: 'Calle Falsa 123',
            city: 'Buenos Aires',
            country: 'Argentina',
          });
          savedChurch = await queryRunner.manager.save(church);
        }

        // Admin Loop
        this.logger.log(`Checking Admin: ${churchData.adminEmail}`);
        let adminPerson = await this.personRepository.findOne({
          where: { email: churchData.adminEmail },
        });
        if (!adminPerson) {
          const [firstName, ...lastNameParts] = churchData.adminName.split(' ');
          const lastName = lastNameParts.join(' ');

          adminPerson = this.personRepository.create({
            firstName: firstName,
            lastName: lastName,
            fullName: churchData.adminName,
            email: churchData.adminEmail,
            avatarUrl: faker.image.avatar(),
          });
          adminPerson = await queryRunner.manager.save(adminPerson);
        }

        let adminUser = await this.userRepository.findOne({
          where: { email: churchData.adminEmail },
        });
        if (!adminUser) {
          const hashedPassword = await bcrypt.hash('123456', 10);
          adminUser = this.userRepository.create({
            email: churchData.adminEmail,
            password: hashedPassword,
            systemRole: SystemRole.USER,
            isOnboarded: true,
            person: adminPerson,
          });
          await queryRunner.manager.save(adminUser);
        }

        // Church Admin Membership
        let adminMember = await this.memberRepository.findOne({
          where: {
            person: { id: adminPerson.id },
            church: { id: savedChurch.id },
          },
          relations: ['person', 'church'],
        });

        if (!adminMember) {
          adminMember = this.memberRepository.create({
            person: adminPerson,
            church: savedChurch,
            membershipStatus: MembershipStatus.MEMBER,
            ecclesiasticalRole: EcclesiasticalRole.PASTOR,
            functionalRoles: [
              FunctionalRole.ADMIN_CHURCH,
              FunctionalRole.MINISTRY_LEADER,
              FunctionalRole.TREASURER,
              FunctionalRole.AUDITOR,
            ],
            joinedAt: new Date(),
          });
          await queryRunner.manager.save(adminMember);
        } else {
          // FIX: Ensure roles are populated for Admin if empty or just NONE (migration fix)
          let updated = false;
          if (
            !adminMember.functionalRoles ||
            !adminMember.functionalRoles.includes(FunctionalRole.ADMIN_CHURCH)
          ) {
            adminMember.functionalRoles = [
              FunctionalRole.ADMIN_CHURCH,
              FunctionalRole.MINISTRY_LEADER,
            ];
            updated = true;
          }
          if (updated) await queryRunner.manager.save(adminMember);
        }

        // Create Members
        this.logger.log(`Checking Members for ${churchData.name}...`);

        // Map to store Users for Group/Family seeding
        const emailToUserMap = new Map<string, User>();
        const emailToMemberMap = new Map<string, ChurchPerson>();
        emailToUserMap.set(churchData.adminEmail, adminUser); // Add admin
        emailToMemberMap.set(churchData.adminEmail, adminMember);

        for (const mData of churchData.members) {
          let person = await this.personRepository.findOne({
            where: { email: mData.email },
          });
          if (!person) {
            const [firstName, ...lastNameParts] = mData.name.split(' ');
            const lastName = lastNameParts.join(' ');

            person = this.personRepository.create({
              firstName: firstName,
              lastName: lastName,
              fullName: mData.name,
              email: mData.email,
              avatarUrl: faker.image.avatar(),
              sex: faker.helpers.enumValue(Sex),
              maritalStatus: faker.helpers.enumValue(MaritalStatus),
              phoneNumber: faker.phone.number(),
              addressLine1: faker.location.streetAddress(),
            });
            person = await queryRunner.manager.save(person);
          }

          let user = await this.userRepository.findOne({
            where: { email: mData.email },
          });
          if (!user) {
            const hashedPassword = await bcrypt.hash('123456', 10);
            user = this.userRepository.create({
              email: mData.email,
              password: hashedPassword,
              systemRole: SystemRole.USER,
              isOnboarded: true,
              person: person,
            });
            user = await queryRunner.manager.save(user);
          }
          emailToUserMap.set(mData.email, user);

          let member = await this.memberRepository.findOne({
            where: {
              person: { id: person.id },
              church: { id: savedChurch.id },
            },
            relations: ['person', 'church'],
          });

          if (member) {
            const shouldUpdate = !member.ecclesiasticalRole;

            if (shouldUpdate) {
              member.ecclesiasticalRole = EcclesiasticalRole.NONE;
              member.functionalRoles = [FunctionalRole.MEMBER];
              await queryRunner.manager.save(member);
              this.logger.log(`Updated roles for member: ${mData.email}`);
            }
          } else {
            member = this.memberRepository.create({
              person: person,
              church: savedChurch,
              membershipStatus:
                (mData.status as MembershipStatus) || MembershipStatus.MEMBER,
              ecclesiasticalRole: EcclesiasticalRole.NONE,
              functionalRoles: [FunctionalRole.MEMBER],
              joinedAt: faker.date.past(),
            });
            member = await queryRunner.manager.save(member);
          }
          emailToMemberMap.set(mData.email, member);
        }

        // Seed Treasury
        if (churchData.treasury) {
          this.logger.log(`Creating Treasury data for ${churchData.name}...`);
          const accountMap = new Map<string, Account>();
          const categoryMap = new Map<string, TransactionCategory>();

          // 1. Categories
          if (churchData.treasury.categories) {
            for (const catData of churchData.treasury.categories) {
              let category = await this.categoryRepository.findOne({
                where: { name: catData.name, church: { id: savedChurch.id } },
              });

              if (!category) {
                category = this.categoryRepository.create({
                  name: catData.name,
                  type: catData.type as TransactionType,
                  color: catData.color,
                  church: savedChurch,
                });
                category = await queryRunner.manager.save(category);
              }
              categoryMap.set(catData.name, category);
            }
          }

          // Wait, I need to check if TransactionCategory repository is available.
          // It is NOT in the constructor args I saw earlier.
          // I should probably add it.

          // For now, let's fix the Critical missing fields: Type and AmountBaseCurrency.
          // And try to map accounts correctly.

          for (const accData of churchData.treasury.accounts) {
            let account = await this.accountRepository.findOne({
              where: { name: accData.name, church: { id: savedChurch.id } },
            });
            if (!account) {
              account = this.accountRepository.create({
                name: accData.name,
                type: accData.type as AccountType,
                currency: accData.currency,
                balance: accData.balance,
                church: savedChurch,
              });
              account = await queryRunner.manager.save(account);
            }
            accountMap.set(accData.name, account);
          }

          for (const txData of churchData.treasury.transactions) {
            // Handle potential optional source/dest based on type
            const sourceAcc = txData.source
              ? accountMap.get(txData.source)
              : null;
            const destAcc = txData.dest ? accountMap.get(txData.dest) : null;
            const category = txData.category
              ? categoryMap.get(txData.category)
              : null;

            console.error(
              `Checking tx: ${txData.description} | Type: ${txData.type}`,
            );
            // Strict check?
            if (
              (txData.type === 'expense' && !sourceAcc) ||
              (txData.type === 'income' && !destAcc)
            ) {
              // Skip invalid
              console.error(
                `Skipping invalid tx: ${txData.description} | Type: ${txData.type} | Src: ${!!sourceAcc} | Dest: ${!!destAcc}`,
              );
              continue;
            }

            console.error(`Processing tx: ${txData.description}`);

            // Deduplication Check
            const existingTx = await this.treasuryRepository.findOne({
              where: {
                description: txData.description,
                amount: txData.amount,
                church: { id: savedChurch.id },
                date: new Date(txData.date), // Check by date too
              },
            });

            if (!existingTx) {
              const rate = txData.rate || 1;
              const tx = this.treasuryRepository.create({
                description: txData.description,
                amount: txData.amount,
                amountBaseCurrency: txData.amount * rate,
                currency: txData.currency,
                exchangeRate: rate,
                type: txData.type as TransactionType,
                sourceAccount: sourceAcc,
                destinationAccount: destAcc,
                category: category,
                church: savedChurch,
                status: TransactionStatus.COMPLETED,
                date: new Date(txData.date), // Fix Date
              });
              await queryRunner.manager.save(tx);
            } else {
              this.logger.log(
                `Skipping existing transaction: ${txData.description}`,
              );
            }
          }
        }

        // Seed library skipped down below

        if (churchData.library) {
          this.logger.log(
            `📚 Found Library section with ${churchData.library.books.length} books. Processing...`,
          );
          const bookMap = new Map<string, Book>();

          // Pre-fetch all categories into a map for quick access
          const categories = await this.bookCategoryRepository.find();
          const categoryMap = new Map<string, BookCategory>(categories.map(c => [c.name, c]));
          const defaultCategory = categoryMap.get('Varios');

          for (const bookData of churchData.library.books) {
            let savedBook = await this.bookRepository.findOne({
              where: { title: bookData.title, church: { id: savedChurch.id } },
            });

            if (!savedBook) {
              const book = this.bookRepository.create({
                title: bookData.title,
                author: bookData.author,
                category: categoryMap.get(bookData.category) || defaultCategory,
                description: bookData.description,
                isbn: bookData.isbn,
                coverUrl: bookData.coverUrl, // Imagen de libro elegante
                ownershipType: BookOwnershipType.CHURCH,
                status: BookStatus.AVAILABLE,
                church: savedChurch,
                code: `LIB-${faker.number.int({ min: 100, max: 999 })}`,
              });
              savedBook = await queryRunner.manager.save(book);
            }
            bookMap.set(bookData.title, savedBook);
          }

          if (churchData.library.loans) {
            for (const loanData of churchData.library.loans) {
              const book = bookMap.get(loanData.bookTitle);
              const member = emailToMemberMap.get(loanData.memberEmail);

              if (book && member) {
                // Check if active loan exists
                const activeLoan = await this.loanRepository.findOne({
                  where: {
                    book: { id: book.id },
                    status: LoanStatus.DELIVERED,
                  },
                });

                if (!activeLoan) {
                  const loan = this.loanRepository.create({
                    book: book,
                    borrower: member,
                    churchId: savedChurch.id,
                    requestedAt: new Date(),
                    deliveredAt: new Date(),
                    dueDate: faker.date.future(),
                    status: LoanStatus.DELIVERED,
                  });
                  await queryRunner.manager.save(loan);

                  // Update book status
                  book.status = BookStatus.LOANED;
                  await queryRunner.manager.save(book);
                }
              }
            }
          }
        }

        // Seed Groups
        if (churchData.smallGroups) {
          this.logger.log(`Creating Groups for ${churchData.name}...`);
          for (const groupData of churchData.smallGroups) {
            let savedGroup = await this.groupRepository.findOne({
              where: { name: groupData.name, church: { id: savedChurch.id } },
            });

            if (savedGroup) {
              this.logger.log(
                `Group ${groupData.name} already exists. Skipping...`,
              );
              continue;
            }

            const group = this.groupRepository.create({
              name: groupData.name,
              description: groupData.description || 'Grupo de Crecimiento',
              type: groupData.type || GroupType.SMALL_GROUP,
              visibility: GroupVisibility.PUBLIC,
              church: savedChurch,
            });
            savedGroup = await queryRunner.manager.save(group);

            // Add Leader
            const leaderMember = emailToMemberMap.get(groupData.leaderEmail);
            if (leaderMember) {
              const groupParticipant = this.groupMemberRepository.create({
                churchPerson: leaderMember,
                group: savedGroup,
                role: GroupRole.LEADER,
                joinedAt: new Date(),
              });
              await queryRunner.manager.save(groupParticipant);
            }

            // Add Members
            if (groupData.membersEmails) {
              for (const email of groupData.membersEmails) {
                const member = emailToMemberMap.get(email);
                if (member) {
                  const groupParticipant = this.groupMemberRepository.create({
                    churchPerson: member,
                    group: savedGroup,
                    role: GroupRole.MEMBER,
                    joinedAt: new Date(),
                  });
                  await queryRunner.manager.save(groupParticipant);
                }
              }
            }
          }
        }

        // Families block...
        // Fam block starts
        if (churchData.families) {
          this.logger.log(`Creating Families for ${churchData.name}...`);
          for (const familyData of churchData.families) {
            const family = this.familyRepository.create({
              name: familyData.name,
              church: savedChurch,
            });
            const savedFamily = await queryRunner.manager.save(family);

            // Add Head
            // Add Head
            const headUser = emailToUserMap.get(familyData.headEmail);
            if (headUser) {
              const headChurchPerson = await queryRunner.manager.findOne(
                ChurchPerson,
                {
                  where: {
                    person: { user: { id: headUser.id } },
                    church: { id: savedChurch.id },
                  },
                },
              );

              if (headChurchPerson) {
                const headMember = this.familyMemberRepository.create({
                  member: headChurchPerson,
                  family: savedFamily,
                  role: FamilyRole.FATHER,
                  joinedAt: new Date(),
                });
                await queryRunner.manager.save(headMember);
              }
            }

            // Add Members
            if (familyData.membersEmails) {
              for (const email of familyData.membersEmails) {
                const memberUser = emailToUserMap.get(email);
                if (memberUser) {
                  const memberChurchPerson = await queryRunner.manager.findOne(
                    ChurchPerson,
                    {
                      where: {
                        person: { user: { id: memberUser.id } },
                        church: { id: savedChurch.id },
                      },
                    },
                  );

                  if (memberChurchPerson) {
                    const famMember = this.familyMemberRepository.create({
                      member: memberChurchPerson,
                      family: savedFamily,
                      role: FamilyRole.CHILD, // Default to CHILD for now
                      joinedAt: new Date(),
                    });
                    await queryRunner.manager.save(famMember);
                  }
                }
              }
            }
          }
        }

        // Seed Ministries
        if (churchData.ministries) {
          this.logger.log(`Creating Ministries for ${churchData.name}...`);
          for (const minData of churchData.ministries) {
            let savedMinistry = await this.ministryRepository.findOne({
              where: { name: minData.name, church: { id: savedChurch.id } },
            });

            if (!savedMinistry) {
              const ministry = this.ministryRepository.create({
                name: minData.name,
                description: `Ministerio de ${minData.name}`,
                status: 'active',
                church: savedChurch,
              });
              savedMinistry = await queryRunner.manager.save(ministry);
            }

            // Assign Leader
            if (minData.leaderEmail) {
              const leaderUser = emailToUserMap.get(minData.leaderEmail);
              if (leaderUser) {
                const leaderMember = await queryRunner.manager.findOne(
                  ChurchPerson,
                  {
                    where: {
                      person: { user: { id: leaderUser.id } },
                      church: { id: savedChurch.id },
                    },
                  },
                );
                if (leaderMember) {
                  // Check if already a member of this ministry
                  const existingMembership =
                    await this.ministryMemberRepository.findOne({
                      where: {
                        ministry: { id: savedMinistry.id },
                        member: { id: leaderMember.id },
                      },
                    });

                  if (!existingMembership) {
                    const membership = this.ministryMemberRepository.create({
                      ministry: savedMinistry,
                      member: leaderMember,
                      roleInMinistry: MinistryRole.LEADER,
                      status: 'active',
                      joinedAt: new Date(),
                    });
                    await queryRunner.manager.save(membership);

                    // Update Ministry Leader reference
                    savedMinistry.leader = leaderMember;
                    await queryRunner.manager.save(savedMinistry);
                  }
                }
              }
            }

            // Assign 6 Random Members
            const allMembers = await queryRunner.manager.find(ChurchPerson, {
              where: { church: { id: savedChurch.id } },
              relations: ['person'],
            });
            // Filter out leader if exists
            const potentialMembers = allMembers.filter((m) =>
              minData.leaderEmail
                ? m.person?.email !== minData.leaderEmail
                : true,
            );

            // Shuffle Array
            const shuffled = potentialMembers.sort(() => 0.5 - Math.random());
            const selectedMembers = shuffled.slice(0, 6);

            for (const member of selectedMembers) {
              const existingMembership =
                await this.ministryMemberRepository.findOne({
                  where: {
                    ministry: { id: savedMinistry.id },
                    member: { id: member.id },
                  },
                });

              if (!existingMembership) {
                const membership = this.ministryMemberRepository.create({
                  ministry: savedMinistry,
                  member: member,
                  roleInMinistry: MinistryRole.TEAM_MEMBER,
                  status: 'active',
                  joinedAt: faker.date.past(), // Random past date
                });
                await queryRunner.manager.save(membership);
              }
            }

            // Create Roles (ServiceDuty)
            if (minData.roles) {
              for (const roleData of minData.roles) {
                const existingRole = await this.serviceDutyRepository.findOne({
                  where: {
                    name: roleData.name,
                    ministry: { id: savedMinistry.id },
                  },
                });

                if (!existingRole) {
                  const duty = this.serviceDutyRepository.create({
                    name: roleData.name,
                    behaviorType:
                      (roleData.behavior as ServiceDutyBehavior) ||
                      ServiceDutyBehavior.STANDARD,
                    ministry: savedMinistry,
                  });
                  await queryRunner.manager.save(duty);
                }
              }
            }
          }
        }
      }

      // FINAL LOG
      const txCount = await this.treasuryRepository.count();
      this.logger.log(
        `✅ SEEDING COMPLETE. Treasury Transactions in DB: ${txCount}`,
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        'Seeding completed successfully! (Churches, Members and Library updated)',
      );
      return { message: 'Seeding successful' };
    } catch (err) {
      this.logger.error('Seeding failed', err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
