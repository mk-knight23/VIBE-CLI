/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri, Event, Disposable, ProviderResult } from 'vscode';

export { ProviderResult } from 'vscode';

export interface API {
	readonly repositories: Repository[];
	readonly onDidOpenRepository: Event<Repository>;
	readonly onDidCloseRepository: Event<Repository>;
	getRepository(uri: Uri): Repository | null;
}

export interface GitExtension {
	readonly enabled: boolean;
	readonly onDidChangeEnablement: Event<boolean>;
	getAPI(version: 1): API;
}

export interface Repository {
	readonly rootUri: Uri;
	readonly state: RepositoryState;
	readonly inputBox: InputBox;
}

export interface RepositoryState {
	readonly HEAD: Branch | undefined;
	readonly refs: Ref[];
	readonly remotes: Remote[];
	readonly onDidChange: Event<void>;
}

export interface InputBox {
	value: string;
}

export interface Branch extends Ref {
	readonly upstream?: Branch;
	readonly ahead?: number;
	readonly behind?: number;
}

export interface Ref {
	readonly type: RefType;
	readonly name?: string;
	readonly commit?: string;
	readonly remote?: string;
}

export const enum RefType {
	Head,
	RemoteHead,
	Tag
}

export interface Remote {
	readonly name: string;
	readonly fetchUrl?: string;
	readonly pushUrl?: string;
	readonly isReadOnly: boolean;
}