import { Injectable } from '@nestjs/common';
import { GetLoansUseCase } from './get-loans.use-case';

@Injectable()
export class GetMyLoansUseCase {
    constructor(private getLoansUseCase: GetLoansUseCase) { }

    async execute(churchId: string, memberId: string) {
        return this.getLoansUseCase.execute(churchId, { borrowerId: memberId });
    }
}
