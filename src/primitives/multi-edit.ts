import { BasePrimitive, PrimitiveResult } from './types';
import { providerRouter } from '../adapters/router';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/structured-logger';

const logger = new Logger('MultiEditPrimitive');

export class MultiEditPrimitive extends BasePrimitive {
    public id = 'multi-edit';
    public name = 'Multi-Edit Primitive';

    public async execute(input: { files: string[]; description: string }): Promise<PrimitiveResult> {
        logger.info(`Editing ${input.files.length} files: ${input.description}`);

        try {
            // 1. Read files
            const fileContents: Record<string, string> = {};
            for (const file of input.files) {
                if (fs.existsSync(file)) {
                    fileContents[file] = await fs.readFile(file, 'utf-8');
                }
            }

            // 2. Prepare LLM prompt
            const systemPrompt = `You are a surgical code editor. 
Given a set of files and a transformation request, output the UPDATED content for EACH modified file.
Format your output as a JSON object where keys are file paths and values are the NEW content of the entire file.

Example:
{ "src/main.ts": "...new content..." }`;

            const userPrompt = `Request: ${input.description}\n\nFiles:\n${JSON.stringify(fileContents, null, 2)}`;

            const response = await providerRouter.completion(userPrompt, {
                systemPrompt,
            });

            // 3. Parse and apply changes
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { success: false, error: 'Could not parse changes from LLM output' };
            }

            const updates = JSON.parse(jsonMatch[0]);
            const appliedFiles = [];

            for (const [filePath, newContent] of Object.entries(updates)) {
                await fs.mkdirp(path.dirname(filePath as string));
                await fs.writeFile(filePath as string, newContent as string);
                appliedFiles.push(filePath);
            }

            return {
                success: true,
                data: { appliedFiles },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
