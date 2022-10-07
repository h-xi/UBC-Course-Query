import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import {processCourses, createCourseMapping} from "./courseHelpers";
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
		return new Promise((fullfill, reject) => {
			if (id.includes("_") || id.trim().length === 0) {
				reject(new InsightError("Invalid ID"));
			}
			if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
				reject(new NotFoundError());
			}
			try {
				console.log(this.addedDatasetID);
				fs.removeSync(path.join(__dirname, `../../data/${id}.json`));
				this.addedDatasetID = this.addedDatasetID.filter((e) => e !== id);
				console.log(this.addedDatasetID);
				fullfill(id);
			} catch(e){
				reject(e);
			};
		});
	};


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
		let whereResult: boolean = this.checkWhere(query.WHERE, idStringArray);
		let optionsResult: boolean = this.checkOptions(query.OPTIONS, idStringArray);
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

	private checkOptions(options: any, idArray: string []): boolean {
		let columnField: string[] = [];
		if (Object.keys(options).length === 0 || Object.keys(options).length > 2) {
			throw new InsightError("error: invalid structure in OPTIONS");
		}
		for (let key in options) {
			if (!(key === "COLUMNS" || key === "ORDER")) {
				throw new InsightError("error: unexpected key in OPTIONS");
			}
			if (key === "COLUMNS") {
				const keys: any[] = options["COLUMNS"];
				if (keys.length === 0) {
					throw new InsightError("error: cannot have empty array for COLUMNS");
				}
				for (let k of keys) {
					if (typeof k !== "string") {
						throw new InsightError("error: unexpected key type in COLUMNS ");
					}
					const words = k.split("_");
					if (words.length !== 2) {
						throw new InsightError("error: invalid key:" + k);
					}
					idArray.push(words[0]);
					const field = words[1];
					if (!(field === "dept" || field === "id" || field === "instructor" || field === "title"
						|| field === "uuid" || field === "avg" || field === "pass" || field === "fail"
						|| field === "audit" || field === "year")) {
						throw new InsightError("error: invalid field:" + field);
					}
					columnField.push(field);
				}
			}
		}
		if (Object.keys(options).length === 2) {
			const orderKey = options["ORDER"];
			if (typeof orderKey !== "string") {
				throw new InsightError("error: invalid order key type");
			}
			const words = orderKey.split("_");
			if (words.length !== 2) {
				throw new InsightError("error: invalid order key:" + orderKey);
			}
			idArray.push(words[0]);
			const orderField: string = words[1];
			if (!columnField.includes(orderField)) {
				throw new InsightError("error: order key not in COLUMNS");
			}
		}
		return true;
	}

	private checkWhere(body: any, idArray: string []): boolean {
		if (Object.keys(body).length === 0) {
			return true;
		} else if (Object.keys(body).length > 1) {
			throw new InsightError("error: invalid WHERE structure");
		}
		return this.checkFilter(body, idArray);
	}

	private checkFilter(body: any, idArray: string []): boolean {
		for (let key in body) {
			if (key === "AND" || key === "OR") {
				let resultLogicCheck = this.checkLogic(body, key, idArray);
				return resultLogicCheck;
			} else if (key === "LT" || key === "GT" || key === "EQ") {
				let resultMComparisonCheck = this.checkMComparison(body[key], idArray);
				return resultMComparisonCheck;
			} else if (key === "IS") {
				let resultSComparisonCheck = this.checkSComparison(body[key], idArray);
				return resultSComparisonCheck;
			} else if (key === "NOT") {
				let resultNegationCheck = this.checkNegation(body[key], idArray);
				return resultNegationCheck;
			} else {
				throw new InsightError("error: unexpected key in WHERE");
			}
		}
		return true; // change this
	}

	private checkLogic(body: any, key: string, idArray: string []): boolean {
		let objectArray = body[key];
		let counter: number = 0;
		if (objectArray.length === 0) {
			throw new InsightError("error: invalid logic key structure");
		} else {
			for (let i of objectArray) {
				if (this.checkFilter(i, idArray)) {
					counter++;
				}
			}
			return counter === objectArray.length;
		}
	}

	private checkMComparison(filterObject: any, idArray: string []): boolean {
		if (Object.keys(filterObject).length === 0 || Object.keys(filterObject).length > 1) {
			throw new InsightError("error: invalid MComparison structure");
		}
		// 1.check key is mKey
		// 2. check value is number
		let isn: boolean = typeof Object.values(filterObject)[0] === "number";
		let isMKey: boolean = this.isMKey(Object.keys(filterObject)[0], idArray);
		return isn && isMKey;
	}

	private isMKey(key: string, idArray: string []): boolean {   // "sections_avg"
		const words = key.split("_");
		if (words.length !== 2) {
			throw new InsightError("error: invalid key:" + key);
		}
		const mKey = words[0];
		idArray.push(mKey);
		const mField = words[1];
		if (!(mField === "avg" || mField === "pass" || mField === "fail" || mField === "audit" || mField === "year")) {
			throw new InsightError("error: invalid field:" + mField);
		}
		return true;
	}

	private checkSComparison(body: any, idArray: string []): boolean {
		if (Object.keys(body).length === 0 || Object.keys(body).length > 1) {
			throw new InsightError("error: invalid SComparison structure");
		}
		// 1.check key is sKey
		// 2. check value is string
		let isValidString: boolean = this.checkValidString(Object.values(body)[0]);
		let isSKey: boolean = this.isSKey(Object.keys(body)[0], idArray);
		return isValidString && isSKey;
	}

	private checkValidString(value: unknown): boolean {
		if (typeof value !== "string") {
			throw new InsightError("error: invalid type in SComparison");
		} else {
			for (let i = 0; i < value.length; i++) {
				if ((i !== 0 && i !== (value.length - 1)) && (value[i] === "*")) {
					throw new InsightError("error: * can only be used at start and end of a string");
				}
			}
		}
		return true;
	}

	private isSKey(key: string, idArray: string []): boolean {  // "sections_dept"
		const words = key.split("_");
		if (words.length !== 2) {
			throw new InsightError("error: invalid key:" + key);
		}
		const sKey = words[0];
		idArray.push(sKey);
		const sField = words[1];
		if (!(sField === "dept" || sField === "id" || sField === "instructor" || sField === "title"
			|| sField === "uuid")) {
			throw new InsightError("error: invalid field:" + sField);
		}
		return true;
	}

	private checkNegation(body: any, idArray: string []): boolean {
		if (Object.keys(body).length === 0 || Object.keys(body).length > 1) {
			throw new InsightError("error: invalid structure in negation");
		}
		return this.checkFilter(body, idArray);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve([]);
	}
// if (filePath.match(`courses\/[^\.].*`)) {
}

