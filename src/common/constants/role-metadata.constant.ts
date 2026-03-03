import {
  SystemRole,
  MinistryRole,
  FamilyRole,
  EcclesiasticalRole,
} from '../enums';
import { MembershipStatus } from '../../members/enums/membership-status.enum';

export const ROLE_METADATA = {
  [SystemRole.ADMIN_APP]: {
    label: 'Super Admin',
    description: 'Administrador global del sistema SaaS.',
  },
  [SystemRole.USER]: {
    label: 'Usuario',
    description: 'Usuario estándar del sistema.',
  },
  // Membership Status
  [MembershipStatus.MEMBER]: {
    label: 'Miembro',
    description: 'Miembro oficial en plena comunión.',
  },
  [MembershipStatus.DISCIPLINED]: {
    label: 'En Disciplina',
    description: 'Miembro con restricciones temporales.',
  },
  [MembershipStatus.EXCOMMUNICATED]: {
    label: 'Excomulgado',
    description: 'Separado de la comunión de la iglesia.',
  },
  [MembershipStatus.INACTIVE]: {
    label: 'Inactivo',
    description: 'Miembro histórico o que se ha mudado.',
  },
  // Ecclesiastical Roles
  [EcclesiasticalRole.PASTOR]: {
    label: 'Pastor',
    description: 'Ministro ordenado responsable de la congregación.',
  },
  [EcclesiasticalRole.BISHOP]: {
    label: 'Obispo',
    description: 'Supervisor de múltiples congregaciones o regiones.',
  },
  [EcclesiasticalRole.ELDER]: {
    label: 'Anciano',
    description: 'Líder espiritual y administrativo local.',
  },
  [EcclesiasticalRole.DEACON]: {
    label: 'Diácono',
    description: 'Servidor ordenado para asistencia práctica.',
  },
  [EcclesiasticalRole.NONE]: {
    label: 'Sin Cargo',
    description: 'Miembro sin rol eclesiástico específico.',
  },
  // Ministry Roles
  [MinistryRole.LEADER]: {
    label: 'Líder de Ministerio',
    description: 'Encargado principal del ministerio.',
  },
  [MinistryRole.TEAM_MEMBER]: {
    label: 'Miembro del Equipo',
    description: 'Parte activa del equipo de trabajo.',
  },
  // Family Roles
  [FamilyRole.FATHER]: {
    label: 'Padre',
    description: 'Cabeza de familia (Padre).',
  },
  [FamilyRole.MOTHER]: {
    label: 'Madre',
    description: 'Madre de familia.',
  },
  [FamilyRole.CHILD]: {
    label: 'Hijo/a',
    description: 'Hijo o hija en el núcleo familiar.',
  },
};
