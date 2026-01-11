import inquirer from 'inquirer';
import { BasePrimitive, PrimitiveResult } from './types';
import chalk from 'chalk';

export class ApprovalPrimitive extends BasePrimitive {
    public id = 'approval';
    public name = 'Approval Primitive';

    public async execute(input: { message: string; data?: any }): Promise<PrimitiveResult> {
        console.log(chalk.yellow('\n⚠️  ACTION REQUIRED: Approval Requested'));
        console.log(chalk.white(input.message));

        if (input.data) {
            console.log(chalk.gray(JSON.stringify(input.data, null, 2)));
        }

        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'approved',
                message: 'Do you approve this action?',
                default: false,
            },
        ]);

        if (answers.approved) {
            return { success: true };
        } else {
            return { success: false, error: 'User denied approval' };
        }
    }
}
