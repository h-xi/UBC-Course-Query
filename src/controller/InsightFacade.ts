import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";


import {checkOptions, checkWhere} from "./CheckQueryValidHelpers";
import {createCourseMapping, findNumRows, processCourses} from "./DatasetProcessHelpers";
import {filterDataSet} from "./PerformQueryHelpers";
import fs from "fs-extra";
import path from "path";
import e from "express";

interface MemoryDataSet {
	id: string,
	content: any []
}

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private addedDatasetID: string[] = [];
	private listOfAddedData: InsightDataset[] = [];
	private memDataset: MemoryDataSet[] = [];
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
				const memoryContent = createCourseMapping(id, courseArray);
				const numRows = findNumRows(courseArray);
				this.addIntoListOfAddedData(id, numRows, kind);
				const datasetMem = {} as MemoryDataSet;
				datasetMem.id = id;
				datasetMem.content = memoryContent;
				this.memDataset.push(datasetMem);
				this.addedDatasetID.push(id);
				console.log(this.memDataset);
				return this.addedDatasetID;
			} catch (error) {
				console.log(error);
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
				fs.removeSync(path.join(__dirname, `../../data/${id}.json`));
				this.addedDatasetID = this.addedDatasetID.filter((dataID) => dataID !== id);
				this.memDataset = this.memDataset.filter((o) => o.id !== id);
				fullfill(id);
			} catch (error) {
				reject(error);
			}
		});
	};

	// public isQuery(query: unknown): query is object {
	// 	return query !== null && query !== undefined && typeof query === "object" && !Array.isArray(query);
	// }

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((fullfill, reject) => {
			let queryDataSet: MemoryDataSet|undefined;
			let id: string = "";
			try {
				id = this.isQueryValid(query);
				queryDataSet = this.retrieveDatasetInMemory(id);
			} catch (error) {
				reject(error);
			}
			if (typeof queryDataSet === "undefined") {
				reject (new InsightError("error when retrieved dataset"));
			}
			const queryContent = queryDataSet?.content;
			if (typeof queryContent === "undefined") {
				reject (new InsightError("empty content of retrieved dataset"));
			}
			const filter = (query as any)["WHERE"];
			const options = (query as any)["OPTIONS"];
			let filteredDataSet = filterDataSet(filter, queryContent);
			if (filteredDataSet.length === 0) {
				const zeroResult = [] as InsightResult[];
				fullfill(zeroResult);
			}
			if (filteredDataSet.length > 5000) {
				reject(new ResultTooLargeError("query result more than 5000 results"));
			}
			let columnsKey: string [] = this.getColumnsKey(options);  // eg: ["dept", "avg"]
			let finalResult: InsightResult [] = this.getColumnsResult(filteredDataSet, columnsKey);
			if (Object.keys(options).length === 2) {
				finalResult = this.sortResult(finalResult, options["ORDER"]);
			}
			finalResult = this.renameKeyWithId(finalResult, id);
			fullfill(finalResult);
		});
	}

	private renameKeyWithId(finalResult: InsightResult [], id: string): InsightResult [] {
		const newHalfID: string = id + "_";
		for (let eachSection of finalResult) {
			const oldKeyArray = Object.keys(eachSection);  // eg: ["avg", "dept"]
			for (let eachOldKey of oldKeyArray) {
				eachSection[newHalfID + eachOldKey] = eachSection[eachOldKey];
				delete eachSection[eachOldKey];
			}
		}
		return finalResult;
	}

	private sortResult(finalResult: InsightResult [], order: string): InsightResult []{
		const orderKey: string = order.split("_")[1];  // eg: "avg"
		if (orderKey === "avg" || orderKey === "pass" || orderKey === "fail" || orderKey === "audit" ||
			orderKey === "year") {
			finalResult.sort((a,b) => {
				return (a as any)[orderKey] - (b as any)[orderKey];
			});
		} else {
			finalResult.sort(function(a, b) {
				if ((a as any)[orderKey] < (b as any)[orderKey]) {
					return -1;
				}
				if ((a as any)[orderKey] > (b as any)[orderKey]) {
					return 1;
				}
				return 0;
			});
		}
		return finalResult;
	}


	private getColumnsResult(filteredDataSet: any[], columnsKey: string[]): InsightResult [] {
		let result: InsightResult [] = [];
		for (let eachSection of filteredDataSet) {
			let temp: InsightResult = {};
			for (let eachKey of columnsKey) {
				temp[eachKey] = eachSection[eachKey];
			}
			result.push(temp);
		}
		return result;
	};

	private getColumnsKey(columns: any): string [] {
		let returnKeys: string [] = [];
		const columnKeys: string[] = columns["COLUMNS"];
		for (let eachKey of columnKeys) {
			let key = eachKey.split("_")[1];
			returnKeys.push(key);
		}
		return returnKeys;
	}

	private isQueryValid(query: any): string {   // can return dataset id here
		let idStringArray: string [] = [];

		if (typeof query === "object") {
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
			if (typeof query.OPTIONS !== "object") {
				throw new InsightError("options must be object");
			}
			let whereResult: boolean = checkWhere(query.WHERE, idStringArray);
			let optionsResult: boolean = checkOptions(query.OPTIONS, idStringArray);
			let datasetAccessResult: boolean = this.checkDatasetAccess(idStringArray);
			if (!(whereResult && optionsResult && datasetAccessResult) || idStringArray.length === 0) {
				throw new InsightError("error: invalid query");
			}
			return idStringArray[0];
		} else {
			throw new InsightError("query must be object");
		}
	}

	private checkDatasetAccess(idArray: string[]): boolean {
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
		return new Promise((fullfill) => {
			fullfill(this.listOfAddedData);
		});
	}

	private addIntoListOfAddedData = (id: string, numRows: number, kind: InsightDatasetKind) => {
		const addedDataSet = {} as InsightDataset;
		addedDataSet.id = id;
		addedDataSet.numRows = numRows;
		addedDataSet.kind = kind;
		this.listOfAddedData.push(addedDataSet);
	};

	private retrieveDatasetInMemory = (id: string): MemoryDataSet => {
		try {
			const retrieved = this.memDataset.find((o) => o.id === id);
			if (retrieved) {
				return retrieved;
			}else {
				throw new NotFoundError("Dataset not in Memory");
			}
		} catch(error) {
			console.log(error);
			throw new NotFoundError("Dataset not found in Memory");
		}
	};
};
