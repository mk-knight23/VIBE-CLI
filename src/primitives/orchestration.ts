import { BasePrimitive, PrimitiveResult, IPrimitive } from './types';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('OrchestrationPrimitive');

export class OrchestrationPrimitive extends BasePrimitive {
    public id = 'orchestration';
    public name = 'Orchestration Primitive';
    private primitives: Map<string, IPrimitive>;

    constructor(primitives: Map<string, IPrimitive>) {
        super();
        this.primitives = primitives;
    }

    public async execute(input: { plan: any[] }): Promise<PrimitiveResult> {
        const results = [];
        logger.info(`Starting execution of plan with ${input.plan.length} steps.`);

        for (const step of input.plan) {
            const primitive = this.primitives.get(step.primitive.toLowerCase());
            if (!primitive) {
                logger.error(`Unknown primitive: ${step.primitive}`);
                return { success: false, error: `Unknown primitive: ${step.primitive}` };
            }

            logger.info(`[Step ${step.step}] Running ${step.primitive}: ${step.task}`);
            const result = await primitive.execute(step.data || step.input || step);
            results.push({ step: step.step, result });

            if (!result.success) {
                logger.error(`Step ${step.step} failed. Halting orchestration.`);
                return { success: false, data: results, error: result.error };
            }
        }

        return { success: true, data: results };
    }
}
