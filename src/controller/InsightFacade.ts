import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import jsZip from "jszip";
import fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}

	private processCourses = async (zipFile: string): Promise<object[]> => {
		const zip = await jsZip.loadAsync(zipFile, {base64: true});
		let toBeProcessed: any[] = [];
		let processed: object[] = [];
		return new Promise((fullfill, reject) => {
			for (let filePath in zip.files) {
				console.log(filePath);
				// if (filePath.match(`courses\/[^\.].*`)) {
				let file = zip.file(filePath);
				if (file) {
					file.async("string").then((fileString) => {
						toBeProcessed.push(fileString);
					});
				} else {
					reject({InsightError});
					 }
				// }
			}
			for (let dataFile of toBeProcessed) {
				// console.log(dataFile);
				let jsonObject = JSON.parse(dataFile); // parse course if defined
				// console.log(jsonObject);
				processed.push(jsonObject);
			}
			fullfill(processed);
		});
	};

	public processZip = async (zipFile: string, id: string): Promise<object> => {
		const zip = await jsZip.loadAsync(zipFile, {base64: true});
		console.log(zip);
		console.log(id);
		// await this.processCourses(zip);
		return Promise.resolve({});
	};
}

