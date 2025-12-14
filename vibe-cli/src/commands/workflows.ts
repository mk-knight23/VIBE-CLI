export interface WorkflowStep {
  id: string;
  name: string;
  action: (context: WorkflowContext) => Promise<any>;
  condition?: (context: WorkflowContext) => boolean;
  onError?: (error: Error, context: WorkflowContext) => Promise<void>;
}

export interface WorkflowContext {
  data: Map<string, any>;
  results: Map<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();

  registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  async executeWorkflow(workflowId: string, initialData?: Record<string, any>): Promise<WorkflowContext> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const context: WorkflowContext = {
      data: new Map(Object.entries(initialData || {})),
      results: new Map()
    };

    for (const step of workflow.steps) {
      if (step.condition && !step.condition(context)) continue;

      try {
        const result = await step.action(context);
        context.results.set(step.id, result);
      } catch (error) {
        if (step.onError) {
          await step.onError(error as Error, context);
        } else {
          throw error;
        }
      }
    }

    return context;
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }
}
// REMOVED: Template system - AI-ONLY generation required
