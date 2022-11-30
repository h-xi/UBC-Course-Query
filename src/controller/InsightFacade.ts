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
import {checkAllKeysType, checkStrucValid, isSectionField} from "./CheckValidTransformationHelper";
import {createCourseMapping, findNumRows, processCourses} from "./CourseDataProcessHelpers";
import {filterDataSet} from "./PerformQueryHelpers";
import {getColumnsKey, transformData, getColumnsResult, sortResult, renameKeyWithId} from "./TransformationHelper";
import fs from "fs-extra";
import path from "path";
import {processRooms} from "./RoomDataProcessHelpers";

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
				let numRows: number;
				let datasetMem = {} as MemoryDataSet;
				if (kind === InsightDatasetKind.Sections) {
					const courseArray = await processCourses(content);
					const memoryContent = createCourseMapping(id, courseArray);
					numRows = findNumRows(courseArray);
					datasetMem.id = id;
					datasetMem.content = memoryContent;
				} else {
					const roomsArray = await processRooms(id, content);
					numRows = roomsArray.length;
					datasetMem.id = id;
					datasetMem.content = roomsArray;
				}
				this.addIntoListOfAddedData(id, numRows, kind);
				this.memDataset.push(datasetMem);
				this.addedDatasetID.push(id);
				return this.addedDatasetID;
			} catch (error) {
				console.error(error);
				throw new InsightError("Error saving dataset to disk");
			}
		} else {
			if (!this.addedDatasetID.includes(id)) {
				try {
					this.retrieveDatasetFromDisk(id);
				} catch (e) {
					throw new InsightError("Error adding dataset into Memory");
				}
			}
			throw new InsightError("Dataset already exists");
		}
	};

	public removeDataset(id: string): Promise<string> {
		return new Promise((fullfill, reject) => {
			if (id.includes("_") || id.trim().length === 0) {
				reject(new InsightError("Invalid ID"));
			}
			if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
				reject(new NotFoundError("Dataset not found"));
			}
			try {
				fs.removeSync(path.join(__dirname, `../../data/${id}.json`));
				this.addedDatasetID = this.addedDatasetID.filter((dataID) => dataID !== id);
				this.memDataset = this.memDataset.filter((o) => o.id !== id);
				this.listOfAddedData = this.listOfAddedData.filter((o) => o.id !== id);
				fullfill(id);
			} catch (error) {
				reject(error);
			}
		});
	};

	public performQuery = async (query: unknown): Promise<InsightResult[]> => {
		return new Promise((fullfill, reject) => {
			let queryDataSet: MemoryDataSet | undefined;
			let id: string = "";
			try {
				id = this.isQueryValid(query);
				queryDataSet = this.retrieveDatasetInMemory(id);
			} catch (error) {
				reject(error);
			}
			if (typeof queryDataSet === "undefined") {
				reject(new InsightError("error when retrieved dataset"));
			}
			const queryContent = queryDataSet?.content;
			if (typeof queryContent === "undefined") {
				reject(new InsightError("empty content of retrieved dataset"));
			}
			const filter = (query as any)["WHERE"];
			const options = (query as any)["OPTIONS"];
			const transformation = (query as any)["TRANSFORMATIONS"];
			let filteredDataSet = filterDataSet(filter, queryContent);
			if (filteredDataSet.length === 0) {
				const zeroResult = [] as InsightResult[];
				fullfill(zeroResult);
			}
			let transformedData: InsightResult[];
			let columnsKey: string[] = getColumnsKey(options);
			let finalResult: InsightResult[];
			if (typeof transformation !== "undefined") {
				transformedData = transformData(transformation, filteredDataSet);
				if (transformedData.length > 5000) {
					reject(new ResultTooLargeError("query result more than 5000 results"));
				}
				finalResult = getColumnsResult(transformedData, columnsKey);
			} else {
				if (filteredDataSet.length > 5000) {
					reject(new ResultTooLargeError("query result more than 5000 results"));
				}
				finalResult = getColumnsResult(filteredDataSet, columnsKey);
			}
			if (Object.keys(options).length === 2) {
				finalResult = sortResult(finalResult, options["ORDER"]);
			}
			finalResult = renameKeyWithId(finalResult, id);
			fullfill(finalResult);
		});
	};

	private isQueryValid(query: any): string {   // can return dataset id here
		let idStringArray: string [] = [];  // check access dataset id is correct later
		let allKeys: string[] = [];   // check all keys belong to one dataset type
		let transformKeys: string[] = [];  // check columns keys if this is not empty
		let transformResult: boolean = true;

		if (typeof query === "object") {
			transformResult = checkStrucValid(query, idStringArray, allKeys, transformKeys, transformResult);
			let whereResult: boolean = checkWhere(query.WHERE, idStringArray, allKeys);
			let optionsResult: boolean = checkOptions(query.OPTIONS, idStringArray, allKeys, transformKeys);
			let datasetAccessResult: boolean = this.checkDatasetAccess(idStringArray);
			let allKeysResult: boolean = checkAllKeysType(allKeys);
			if (!(whereResult && optionsResult && datasetAccessResult && allKeysResult && transformResult)
				|| idStringArray.length === 0) {
				throw new InsightError("error: invalid query");
			}
			this.checkMatched(allKeys[0], idStringArray[0]);
			return idStringArray[0];
		} else {
			throw new InsightError("query must be object");
		}
	}

	private checkMatched(oneKey: string, id: string) {
		const keyType: boolean = isSectionField(oneKey);
		let idType: InsightDatasetKind | undefined;
		for (let insightDataset of this.listOfAddedData) {
			if (insightDataset.id === id) {
				idType = insightDataset.kind;
			}
		}
		if (keyType) {
			if (idType === undefined || idType === InsightDatasetKind.Rooms) {
				throw new InsightError("key and id type is unmatched");
			}
		} else {
			if (idType === undefined || idType === InsightDatasetKind.Sections) {
				throw new InsightError("key and id type is unmatched");
			}
		}
	}

	private checkDatasetAccess(idArray: string[]): boolean {
		let counter: number = 0;
		for (let s of idArray) {
			if (!this.addedDatasetID.includes(s)) {
				if (!fs.existsSync(path.join(__dirname, `../../data/${s}.json`))) {
					throw new InsightError("error: try to query nonexistent dataset");
				} else {
					try {
						this.retrieveDatasetFromDisk(s);
					} catch (e) {
						console.log(e);
						throw new InsightError("Invalid Dataset");
					}
				}
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

	private retrieveDatasetFromDisk = (id: string) => {
		const diskDataset = fs.readFileSync(path.join(__dirname, `../../data/${id}.json`), "utf-8");
		this.addedDatasetID.push(id);
		let datasetInstance = {} as MemoryDataSet;
		let memInstance = {} as InsightDataset;
		try {
			const parsedData = JSON.parse(diskDataset);
			memInstance.id = id;
			memInstance.kind = parsedData.kind;
			memInstance.numRows = parsedData.content.length;
			datasetInstance.id = id;
			datasetInstance.content = parsedData.content;
			this.memDataset.push(datasetInstance);
			this.listOfAddedData.push(memInstance);
		} catch (e) {
			console.log(e);
			throw new InsightError("Dataset invalid");
		}
	};

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
			console.error(error);
			throw new NotFoundError("Dataset not found in Memory");
		}
	};
};
