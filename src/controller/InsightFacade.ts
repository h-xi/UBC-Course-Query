import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import {processCourses, createCourseMapping} from "./processHelpers";
import {checkOptions} from "./checkOptionsHelper";
import {checkWhere} from "./checkWhereHelpers";

import jsZip from "jszip";
import fs from "fs-extra";
import path from "path";

interface MemoryDataSet {
	id: string,
	content: any []
}
const memDataset = {} as MemoryDataSet;

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private addedDatasetID: string [] = [];
	private memDataset = {} as MemoryDataSet;

	constructor() {
		console.log("InsightFacadeImpl::init()");
	}


	public addDataset = async (id: string, content: string, kind: InsightDatasetKind): Promise<string[]> => {
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid ID");
		}
		if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
			try {
				const courseArray = await processCourses(content);
				const numRows = this.findnumRows(courseArray);
				console.log(numRows);
				const memoryContent = createCourseMapping(id, courseArray);
				// const numRows = this.findnumRows(courseArray);
				// console.log(numRows);
				if (memDataset.id == null && memDataset.content == null) {
				  memDataset.id = id;
				  memDataset.content = memoryContent;
				}
				this.addedDatasetID.push(id);
				console.log(this.addedDatasetID);
				return this.addedDatasetID;
			} catch (e) {
				console.log(e);
				throw new InsightError("Error saving dataset to disk");
			}
		} else {
			console.log("error! Dataset already exists");
			throw new InsightError("Dataset already exists");
		}
	};

	public removeDataset(id: string): Promise<string> {
		return Promise.resolve("");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		if (this.isQueryValid(query)) {
			return Promise.resolve([]);
		} else {
			throw new InsightError("error: invalid query");
		}
	}

	private isQueryValid(query: any): boolean {   // can return dataset id here
		let idStringArray: string [] = [];

		if (Object.keys((query)).length !== 2) {
			throw new InsightError("error: invalid structure of query");
		}
		for (let key in query) {
			if (!(key === "WHERE" || key === "OPTIONS")) {
				throw new InsightError("error: unexpected extra section");
			}
		}
		if (!Object.keys((query)).includes("WHERE") || !Object.keys((query)).includes("OPTIONS")) {
			throw new InsightError("error: miss where or options section");
		}
		let whereResult: boolean = checkWhere(query.WHERE, idStringArray);
		let optionsResult: boolean = checkOptions(query.OPTIONS, idStringArray);
		let datasetAccessResult: boolean = this.checkDatasetAccess(idStringArray);
		return whereResult && optionsResult && datasetAccessResult;
	}

	private checkDatasetAccess(idArray: string []): boolean {
		let counter: number = 0;
		for (let s of idArray) {
			if (!this.addedDatasetID.includes(s)) {
				throw new InsightError("error: try to query nonexistent dataset");
			}
			if (s === idArray[0]) {
				counter++;
			}
		}
		if (counter !== idArray.length) {
			throw new InsightError("error: cannot access multiple datasets");
		}
		return true;
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}

// if (filePath.match(`courses\/[^\.].*`)) {

	private findnumRows = (proccessedData: any []) => {
		let numRows = 0;
		proccessedData.forEach((section: any) => {
		  let result = section.result;
		  numRows += result.length;
		});
		return numRows;
	  };

}

