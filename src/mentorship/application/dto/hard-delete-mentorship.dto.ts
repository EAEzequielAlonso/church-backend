export interface HardDeleteMentorshipProcessDto {
  processId: string;
  executorChurchPersonId: string;
  executorFunctionalRoles: string[]; // Ej: ['ADMIN_CHURCH', 'PASTOR', 'USER']
  confirmString: string;
}
