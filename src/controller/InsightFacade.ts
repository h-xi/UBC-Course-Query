import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import {checkOptions} from "./checkOptionsHelper";
import {checkWhere} from "./checkWhereHelpers";
import {processCourses, createCourseMapping, findNumRows} from "./DatasetProcessHelpers";
import fs from "fs-extra";
import path from "path";

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
	private addedDatasetID: string [] = [];
	private listOfAddedData: InsightDataset [] = [];
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
				datasetMem.content = courseArray;
				this.memDataset.push(datasetMem);
				this.addedDatasetID.push(id);
				console.log(this.memDataset);
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
				fs.removeSync(path.join(__dirname, `../../data/${id}.json`));
				this.addedDatasetID = this.addedDatasetID.filter((e) => e !== id);
				this.memDataset = this.memDataset.filter((o) => o.id !== id);
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

	// private loadDatasetIntoMemory = (id: string) => {
	// 	if (id === this.memDataset.id) {
	// 	  throw new InsightError("Dataset already loaded in Memory");
	// 	}
	// 	try {
	// 	  console.log(this.memDataset);
	// 	  const rawDataset = fs.readFileSync(path.join(__dirname, `../../${id}.json`), "utf-8");
	// 	  const dataSet = JSON.parse(rawDataset);
	// 	  console.log(dataSet);
	// 	  this.memDataset.id = id;
	// 	  this.memDataset.content = dataSet;
	// 	  console.log(this.memDataset);
	// 	  return this.memDataset;
	// 	}catch(e) {
	// 		console.log(e);
	// 		throw new InsightError("Error loading dataset into memory");
	// 	}
	// };
};

